/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gzipSync, strToU8 } from "fflate";

import type Platform from "../../platform/index.js";
import type { Configuration } from "../config.js";
import { GLEAN_VERSION } from "../constants.js";
import { Context } from "../context.js";
import log, { LoggingLevel } from "../log.js";
import type { Observer as PingsDatabaseObserver, PingInternalRepresentation } from "../pings/database.js";
import type PingsDatabase from "../pings/database.js";
import type PlatformInfo from "../platform_info.js";
import { UploadResult } from "./uploader.js";
import type Uploader from "./uploader.js";
import { UploadResultStatus } from "./uploader.js";

const LOG_TAG = "core.Upload";

/**
 * Policies for ping storage, uploading and requests.
 */
export class Policy {
  constructor (
    // The maximum recoverable failures allowed per uploading window.
    //
    // Limiting this is necessary to avoid infinite loops on requesting upload tasks.
    readonly maxRecoverableFailures: number = 3,
    // The maximum size in bytes a ping body may have to be eligible for upload.
    readonly maxPingBodySize: number = 1024 * 1024 // 1MB
  ) {}
}

interface QueuedPing extends PingInternalRepresentation {
  identifier: string
}

/**
 * The possible status of the ping uploader.
 */
const enum PingUploaderStatus {
  // Not currently uploading pings.
  Idle,
  // Currently uploading pings.
  Uploading,
  // Currently processing a signal to stop uploading pings.
  Cancelling,
}

// Error to be thrown in case the final ping body is larger than MAX_PING_BODY_SIZE.
class PingBodyOverflowError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "PingBodyOverflow";
  }
}

/**
 * A ping uploader. Manages a queue of pending pings to upload.
 *
 * Observes the pings database
 * and whenever that is updated we trigger uploading of all enqueued pings.
 *
 * # Note
 *
 * If three retriable upload failures are hit in a row,
 * we bail out before uploading all enqued pings.
 */
class PingUploader implements PingsDatabaseObserver {
  // A FIFO queue of pings.
  private queue: QueuedPing[];
  // The current status of the uploader.
  private status: PingUploaderStatus;
  // A promise that represents the current uploading job.
  // This is `undefined` in case there is no current uploading job.
  private currentJob?: Promise<void>;
  // The object that concretely handles the ping transmission.
  private readonly uploader: Uploader;

  private readonly platformInfo: PlatformInfo;
  private readonly serverEndpoint: string;

  constructor(
    config: Configuration,
    platform: Platform,
    private readonly pingsDatabase: PingsDatabase,
    private readonly policy = new Policy
  ) {
    this.queue = [];
    this.status = PingUploaderStatus.Idle;
    // Initialize the ping uploader with either the platform defaults or a custom
    // provided uploader from the configuration object.npm
    this.uploader = config.httpClient ? config.httpClient : platform.uploader;
    this.platformInfo = platform.info;
    this.serverEndpoint = config.serverEndpoint;
    this.pingsDatabase = pingsDatabase;
  }

  /**
   * Enqueues a new ping at the end of the line.
   *
   * Will not enqueue if a ping with the same identifier is already enqueued.
   *
   * @param ping The ping to enqueue.
   */
  private enqueuePing(ping: QueuedPing): void {
    let isDuplicate = false;
    for (const queuedPing of this.queue) {
      if (queuedPing.identifier === ping.identifier) {
        isDuplicate = true;
      }
    }

    !isDuplicate && this.queue.push(ping);
  }

  /**
   * Gets and removes from the queue the next ping in line to be uploaded.
   *
   * @returns The next ping or `undefined` if no pings are enqueued.
   */
  private getNextPing(): QueuedPing | undefined {
    return this.queue.shift();
  }

  /**
   * Prepares a ping for uploader.
   *
   * This includes:
   *
   * 1. Includes Glean required headers to the ping;
   *    These are the headers described in https://mozilla.github.io/glean/book/user/pings/index.html?highlight=headers#submitted-headers
   * 2. Stringifies the body.
   *
   * @param ping The ping to include the headers in.
   * @returns The updated ping.
   */
  private async preparePingForUpload(ping: QueuedPing): Promise<{
    headers: Record<string, string>,
    payload: string | Uint8Array
  }> {
    let headers = ping.headers || {};
    headers = {
      ...ping.headers,
      "Content-Type": "application/json; charset=utf-8",
      "Date": (new Date()).toISOString(),
      "X-Client-Type": "Glean.js",
      "X-Client-Version": GLEAN_VERSION,
      "X-Telemetry-Agent": `Glean/${GLEAN_VERSION} (JS on ${await this.platformInfo.os()})`
    };

    const stringifiedBody = JSON.stringify(ping.payload);
    // We prefer using `strToU8` instead of TextEncoder directly,
    // because it will polyfill TextEncoder if it's not present in the environment.
    // Environments that don't provide TextEncoder are IE and most importantly QML.
    const encodedBody = strToU8(stringifiedBody);

    let finalBody: string | Uint8Array;
    let bodySizeInBytes: number;
    try {
      finalBody = gzipSync(encodedBody);
      bodySizeInBytes = finalBody.length;
      headers["Content-Encoding"] = "gzip";
    } catch {
      finalBody = stringifiedBody;
      bodySizeInBytes = encodedBody.length;
    }

    if (bodySizeInBytes > this.policy.maxPingBodySize) {
      throw new PingBodyOverflowError(
        `Body for ping ${ping.identifier} exceeds ${this.policy.maxPingBodySize}bytes. Discarding.`
      );
    }

    headers["Content-Length"] = bodySizeInBytes.toString();
    return {
      headers,
      payload: finalBody
    };
  }

  /**
   * Attempts to upload a ping.
   *
   * @param ping The ping object containing headers and payload.
   * @returns The status number of the response or `undefined` if unable to attempt upload.
   */
  private async attemptPingUpload(ping: QueuedPing): Promise<UploadResult> {
    if (!Context.initialized) {
      log(
        LOG_TAG,
        "Attempted to upload a ping, but Glean is not initialized yet. Ignoring.",
        LoggingLevel.Warn
      );
      return new UploadResult(UploadResultStatus.RecoverableFailure);
    }

    try {
      const finalPing = await this.preparePingForUpload(ping);
      return await this.uploader.post(
        // We are sure that the applicationId is not `undefined` at this point,
        // this function is only called when submitting a ping
        // and that function return early when Glean is not initialized.
        `${this.serverEndpoint}${ping.path}`,
        finalPing.payload,
        finalPing.headers
      );
    } catch(e) {
      log(LOG_TAG, ["Error trying to build ping request:", e], LoggingLevel.Warn);
      // An unrecoverable failure will make sure the offending ping is removed from the queue and
      // deleted from the database, which is what we want here.
      return new UploadResult(UploadResultStatus.RecoverableFailure);
    }
  }

  /**
   * Processes the response from an attempt to upload a ping.
   *
   * Based on the HTTP status of said response,
   * the possible outcomes are:
   *
   * 200 - 299 Success**
   *   Any status on the 2XX range is considered a succesful upload,
   *   which means the corresponding ping file can be deleted.
   *
   *   _Known 2XX status:_
   *   200 - OK. Request accepted into the pipeline.
   *
   * 400 - 499 Unrecoverable error**
   *   Any status on the 4XX range means something our client did is not correct.
   *   It is unlikely that the client is going to recover from this by retrying,
   *   so in this case the corresponding ping file can also be deleted.
   *
   *   _Known 4XX status:_
   *   404 - not found - POST/PUT to an unknown namespace
   *   405 - wrong request type (anything other than POST/PUT)
   *   411 - missing content-length header
   *   413 - request body too large Note that if we have badly-behaved clients that
   *           retry on 4XX, we should send back 202 on body/path too long).
   *   414 - request path too long (See above)
   *
   * Any other error**
   *   For any other error, a warning is logged and the ping is re-enqueued.
   *
   *   _Known other errors:_
   *   500 - internal error
   *
   * @param identifier The identifier of the ping uploaded.
   * @param response The response of a ping upload attempt.
   * @returns Whether or not to retry the upload attempt.
   */
  private async processPingUploadResponse(identifier: string, response: UploadResult): Promise<boolean> {
    if (response.status && response.status >= 200 && response.status < 300) {
      log(LOG_TAG, `Ping ${identifier} succesfully sent ${response.status}.`, LoggingLevel.Info);
      await this.pingsDatabase.deletePing(identifier);
      return false;
    }

    if (response.result === UploadResultStatus.UnrecoverableFailure || (response.status && response.status >= 400 && response.status < 500)) {
      log(
        LOG_TAG,
        `Unrecoverable upload failure while attempting to send ping ${identifier}. Error was: ${response.status ?? "no status"}.`,
        LoggingLevel.Warn
      );
      await this.pingsDatabase.deletePing(identifier);
      return false;
    }

    log(
      LOG_TAG,
      [
        `Recoverable upload failure while attempting to send ping ${identifier}, will retry.`,
        `Error was ${response.status ?? "no status"}.`
      ],
      LoggingLevel.Warn
    );
    return true;
  }

  private async triggerUploadInternal(): Promise<void> {
    let retries = 0;
    let nextPing = this.getNextPing();
    while(nextPing && this.status !== PingUploaderStatus.Cancelling) {
      const status = await this.attemptPingUpload(nextPing);
      const shouldRetry = await this.processPingUploadResponse(nextPing.identifier, status);
      if (shouldRetry) {
        retries++;
        this.enqueuePing(nextPing);
      }

      if (retries >= this.policy.maxRecoverableFailures) {
        log(
          LOG_TAG,
          "Reached maximum recoverable failures for the current uploading window. You are done.",
          LoggingLevel.Info
        );
        return;
      }

      nextPing = this.getNextPing();
    }
  }

  /**
   * Triggers the uploading of all enqueued pings.
   *
   * If upload is already ongoing, this is a no-op.
   *
   * # Notes
   *
   * 1. If three retriable failures happen in a row the uploader will stop retrying.
   * 2. Uploading only works when Glean has been initialized.
   *    Otherwise it will reach maximum retriable failures and bail out.
   */
  async triggerUpload(): Promise<void> {
    if (this.status !== PingUploaderStatus.Idle) {
      return;
    }

    this.status = PingUploaderStatus.Uploading;
    try {
      this.currentJob = this.triggerUploadInternal();
      await this.currentJob;
    } finally {
      this.status = PingUploaderStatus.Idle;
    }
  }

  /**
   * Cancels ongoing upload.
   *
   * Does nothing in case another cancel signal has already been issued
   * or if the uploader is current idle.
   *
   * @returns A promise that resolves once the current uploading job is succesfully cancelled.
   */
  async cancelUpload(): Promise<void> {
    if (this.status === PingUploaderStatus.Uploading) {
      this.status = PingUploaderStatus.Cancelling;
      await this.currentJob;
    }

    return;
  }

  /**
   * Clear the pending pings queue.
   *
   * Will cancel any ongoing work before clearing.
   *
   * @returns A promise that resolves once we are done clearing.
   */
  async clearPendingPingsQueue(): Promise<void> {
    await this.cancelUpload();
    this.queue = [];
  }

  /**
   * Enqueues a new ping and trigger uploading of enqueued pings.
   *
   * This function is called by the PingDatabase everytime a new ping is added to the database.
   *
   * @param identifier The id of the ping that was just recorded.
   * @param ping An object containing the newly recorded ping path, payload and optionally headers.
   */
  update(identifier: string, ping: PingInternalRepresentation): void {
    this.enqueuePing({ identifier, ...ping });
    void this.triggerUpload();
  }
}

export default PingUploader;
