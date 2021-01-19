/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GLEAN_VERSION } from "../constants";
import Glean from "glean";
import { Observer as PingsDatabaseObserver, PingInternalRepresentation } from "pings/database";
import Uploader from "upload/uploader";

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

/**
 * The resulting status of an attempted ping upload.
 */
export const enum UploadResultStatus {
  // A recoverable failure.
  //
  // During upload something went wrong,
  // e.g. the network connection failed.
  // The upload should be retried at a later time.
  RecoverableFailure,
  // An unrecoverable upload failure.
  //
  // A possible cause might be a malformed URL.
  UnrecoverableFailure,
  // Request was successfull.
  //
  // This can still indicate an error, depending on the status code.
  Success,
}

/**
 * The result of an attempted ping upload.
 */
export interface UploadResult {
  // The status is only present if `result` is UploadResultStatus.Success
  status?: number,
  // The status of an upload attempt
  result: UploadResultStatus
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

  constructor() {
    this.queue = [];
    this.status = PingUploaderStatus.Idle;
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
   *
   * @returns The updated ping.
   */
  private preparePingForUpload(ping: QueuedPing): {
    headers: Record<string, string>,
    payload: string
  } {
    const stringifiedBody = JSON.stringify(ping.payload);

    let headers = ping.headers || {};
    headers = {
      ...ping.headers,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": stringifiedBody.length.toString(),
      "Date": (new Date()).toISOString(),
      "X-Client-Type": "Glean.js",
      "X-Client-Version": GLEAN_VERSION,
    };

    return {
      headers,
      payload: stringifiedBody
    };
  }

  /**
   * Attempts to upload a ping.
   *
   * @param ping The ping object containing headers and payload.
   *
   * @returns The status number of the response or `undefined` if unable to attempt upload.
   */
  private async attemptPingUpload(ping: QueuedPing): Promise<UploadResult> {
    if (!Glean.initialize) {
      console.warn("Attempted to upload a ping, but Glean is not initialized yet. Ignoring.");
      return { result: UploadResultStatus.RecoverableFailure };
    }

    const finalPing = this.preparePingForUpload(ping);
    const result = await Uploader.post(
      new URL(ping.path, Glean.serverEndpoint),
      finalPing.payload,
      finalPing.headers
    );

    return result;
  }

  /**
   * Processes the response from an attempt to upload a ping.
   *
   * Based on the HTTP status of said response,
   * the possible outcomes are:
   *
   * * **200 - 299 Success**
   *   Any status on the 2XX range is considered a succesful upload,
   *   which means the corresponding ping file can be deleted.
   *
   *   _Known 2XX status:_
   *   * 200 - OK. Request accepted into the pipeline.
   *
   * * **400 - 499 Unrecoverable error**
   *   Any status on the 4XX range means something our client did is not correct.
   *   It is unlikely that the client is going to recover from this by retrying,
   *   so in this case the corresponding ping file can also be deleted.
   *
   *   _Known 4XX status:_
   *   * 404 - not found - POST/PUT to an unknown namespace
   *   * 405 - wrong request type (anything other than POST/PUT)
   *   * 411 - missing content-length header
   *   * 413 - request body too large Note that if we have badly-behaved clients that
   *           retry on 4XX, we should send back 202 on body/path too long).
   *   * 414 - request path too long (See above)
   *
   * * **Any other error**
   *   For any other error, a warning is logged and the ping is re-enqueued.
   *
   *   _Known other errors:_
   *   * 500 - internal error
   *
   * @param identifier The identifier of the ping uploaded.
   * @param response The response of a ping upload attempt.
   *
   * @returns Whether or not to retry the upload attempt.
   */
  private async processPingUploadResponse(identifier: string, response: UploadResult): Promise<boolean> {
    const { status, result } = response;
    if (status && status >= 200 && status < 300) {
      console.info(`Ping ${identifier} succesfully sent ${status}.`);
      await Glean.pingsDatabase.deletePing(identifier);
      return false;
    }

    if (result === UploadResultStatus.UnrecoverableFailure || (status && status >= 400 && status < 500)) {
      console.warn(
        `Unrecoverable upload failure while attempting to send ping ${identifier}. Error was ${status}.`);
      await Glean.pingsDatabase.deletePing(identifier);
      return false;
    }

    console.warn(
      `Recoverable upload failure while attempting to send ping ${identifier}, will retry. Error was ${status}.`);
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

      if (retries >= 3) {
        console.info("Reached maximum recoverable failures for the current uploading window. You are done.");
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
   * Scans the database for pending pings and enqueues them.
   */
  async scanPendingPings(): Promise<void> {
    const pings = await Glean.pingsDatabase.getAllPings();
    for (const identifier in pings) {
      this.enqueuePing({ identifier, ...pings[identifier] });
    }
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
    this.triggerUpload();
  }
}

export default PingUploader;
