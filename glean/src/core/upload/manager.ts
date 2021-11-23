/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gzipSync, strToU8 } from "fflate";

import type { Configuration } from "../config.js";
import { GLEAN_VERSION } from "../constants.js";
import { Context } from "../context.js";
import Dispatcher from "../dispatcher.js";
import log, { LoggingLevel } from "../log.js";
import type {
  Observer as PingsDatabaseObserver,
  PingInternalRepresentation
} from "../pings/database.js";
import type PingsDatabase from "../pings/database.js";
import {
  isDeletionRequest
} from "../pings/database.js";
import type PlatformInfo from "../platform_info.js";
import type Uploader from "./uploader.js";
import { UploadResult, UploadResultStatus } from "./uploader.js";
import RateLimiter, { RateLimiterState } from "./rate_limiter.js";
import Policy from "./policy.js";

const LOG_TAG = "core.Upload";

// Default rate limiter interval, in milliseconds.
export const RATE_LIMITER_INTERVAL_MS = 60 * 1000;
// Default max pings per internal.
export const MAX_PINGS_PER_INTERVAL = 40;

/**
 * Create and initialize a dispatcher for the PingUplaoder.
 *
 * @returns The created dispatcher instance.
 */
function createAndInitializeDispatcher(): Dispatcher {
  const dispatcher = new Dispatcher(100, `${LOG_TAG}.Dispatcher`);
  dispatcher.flushInit();
  return dispatcher;
}

interface QueuedPing extends PingInternalRepresentation {
  // The UUID identifier for this ping.
  readonly identifier: string,
  // How may times there has been a failed upload attempt for this ping.
  retries: number,
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
class PingUploadManager implements PingsDatabaseObserver {
  // A list of pings currently being processed.
  private processing: QueuedPing[];
  // Local dispathcer instance to handle execution of ping requests.
  private dispatcher: Dispatcher;
  // The object that concretely handles the ping transmission.
  private readonly uploader: Uploader;
  // PlatformInfo object containing OS information used to build ping request headers.
  private readonly platformInfo: PlatformInfo;
  // The server address we are sending pings to.
  private readonly serverEndpoint: string;
  // Whether or not uploading is currently stopped due to limits having been hit.
  private stopped = false;

  constructor(
    config: Configuration,
    private readonly pingsDatabase: PingsDatabase,
    private readonly policy = new Policy(),
    private readonly rateLimiter = new RateLimiter(RATE_LIMITER_INTERVAL_MS, MAX_PINGS_PER_INTERVAL)
  ) {
    this.processing = [];
    // Initialize the ping uploader with either the platform defaults or a custom
    // provided uploader from the configuration object.
    this.uploader = config.httpClient ? config.httpClient : Context.platform.uploader;
    this.platformInfo = Context.platform.info;
    this.serverEndpoint = config.serverEndpoint;

    // Initialize the dispatcher immediatelly.
    this.dispatcher = createAndInitializeDispatcher();
  }

  /**
   * Enqueues a new ping at the end of the line.
   *
   * Will not enqueue if a ping with the same identifier is already enqueued.
   *
   * @param ping The ping to enqueue.
   */
  private enqueuePing(ping: QueuedPing): void {
    for (const queuedPing of this.processing) {
      if (queuedPing.identifier === ping.identifier) {
        return;
      }
    }

    // Add the ping to the list of pings being processsed.
    this.processing.push(ping);

    const { state: rateLimiterState, remainingTime } = this.rateLimiter.getState();
    if (rateLimiterState === RateLimiterState.Incrementing) {
      this.dispatcher.resume();
      this.stopped = false;
    } else {
      if(!this.stopped) {
        // Stop the dispatcher respecting the order of the dispatcher queue,
        // to make sure the Stop command is enqueued _after_ previously enqueued requests.
        this.dispatcher.stop(false);
        this.stopped = true;
      }

      if (rateLimiterState === RateLimiterState.Throttled) {
        log(
          LOG_TAG,
          [
            "Succesfully submitted a ping, but Glean is currently throttled.",
            `Pending pings may be uploaded in ${(remainingTime || 0) / 1000}s.`
          ],
          LoggingLevel.Debug
        );
      }
      else if (rateLimiterState === RateLimiterState.Stopped) {
        log(
          LOG_TAG,
          [
            "Succesfully submitted a ping,",
            "but Glean has reached maximum recoverable upload failures for the current uploading window.",
            `May retry in ${(remainingTime || 0) / 1000}s.`
          ],
          LoggingLevel.Debug
        );
      }
    }

    // If the ping is a deletion-request ping, we want to enqueue it as a persistent task,
    // so that clearing the queue does not clear it.
    //
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const launchFn = isDeletionRequest(ping) ? this.dispatcher.launchPersistent : this.dispatcher.launch;

    // Dispatch the uploading task.
    launchFn.bind(this.dispatcher)(async (): Promise<void> => {
      const status = await this.attemptPingUpload(ping);
      const shouldRetry = await this.processPingUploadResponse(ping.identifier, status);

      if (shouldRetry) {
        ping.retries++;
        this.enqueuePing(ping);
      }

      if (ping.retries >= this.policy.maxRecoverableFailures) {
        log(
          LOG_TAG,
          `Reached maximum recoverable failures for ping "${ping.identifier}". You are done.`,
          LoggingLevel.Info
        );
        this.rateLimiter.stop();
        this.dispatcher.stop();
        ping.retries = 0;
      }
    });
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
        `${this.serverEndpoint}${ping.path}`,
        finalPing.payload,
        finalPing.headers
      );
    } catch(e) {
      log(LOG_TAG, [ "Error trying to build ping request:", e ], LoggingLevel.Warn);
      // An unrecoverable failure will make sure the offending ping is removed from the queue and
      // deleted from the database, which is what we want here.
      return new UploadResult(UploadResultStatus.UnrecoverableFailure);
    }
  }

  /**
   * Removes a ping from the processing list.
   *
   * @param identifier The identifier of the ping to be removed.
   */
  private concludePingProcessing(identifier: string): void {
    this.processing = this.processing.filter(ping => ping.identifier !== identifier);
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
    this.concludePingProcessing(identifier);

    const { status, result } = response;
    if (status && status >= 200 && status < 300) {
      log(LOG_TAG, `Ping ${identifier} succesfully sent ${status}.`, LoggingLevel.Info);
      await this.pingsDatabase.deletePing(identifier);
      return false;
    }

    if (result === UploadResultStatus.UnrecoverableFailure || (status && status >= 400 && status < 500)) {
      log(
        LOG_TAG,
        `Unrecoverable upload failure while attempting to send ping ${identifier}. Error was: ${status ?? "no status"}.`,
        LoggingLevel.Warn
      );
      await this.pingsDatabase.deletePing(identifier);
      return false;
    }

    log(
      LOG_TAG,
      [
        `Recoverable upload failure while attempting to send ping ${identifier}, will retry.`,
        `Error was ${status ?? "no status"}.`
      ],
      LoggingLevel.Warn
    );
    return true;
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
    this.dispatcher.resume();
    this.enqueuePing({ identifier, retries: 0, ...ping });
  }

  /**
   * Shuts down internal dispatcher,
   * after executing all previously enqueued ping requests.
   *
   * @returns A promise that resolves once shutdown is complete.
   */
  shutdown(): Promise<void> {
    return this.dispatcher.shutdown();
  }

  /**
   * Clears the pending pings queue.
   *
   * # Important
   *
   * This will _drop_ pending pings still enqueued.
   * Only the `deletion-request` ping will still be processed.
   */
  async clearPendingPingsQueue(): Promise<void> {
    // Clears all tasks.
    this.dispatcher.clear();
    // Wait for remaining jobs and shutdown.
    //
    // The only jobs that may be left after clearing
    // are `deletion-request` uploads.
    await this.dispatcher.shutdown();
    // At this poit we are sure the dispatcher queue is also empty,
    // so we can empty the processing queue.
    this.processing = [];

    // Create and initialize a new dispatcher, since the `shutdown` state is irreversible.
    this.dispatcher = createAndInitializeDispatcher();
  }

  /**
   * Test-Only API**
   *
   * Returns a promise that resolves once the current queue execution in finished.
   *
   * @returns The promise.
   */
  async testBlockOnPingsQueue(): Promise<void> {
    return this.dispatcher.testBlockOnQueue();
  }
}

export default PingUploadManager;
