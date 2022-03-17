/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Configuration } from "../config.js";
import type {
  Observer as PingsDatabaseObserver,
  PingInternalRepresentation
} from "../pings/database.js";
import type PingsDatabase from "../pings/database.js";
import type { UploadResult } from "./uploader.js";
import type { UploadTask} from "./task.js";
import { Context } from "../context.js";
import log, { LoggingLevel } from "../log.js";
import { isDeletionRequest } from "../pings/database.js";
import RateLimiter, { RateLimiterState } from "./rate_limiter.js";
import { UploadResultStatus } from "./uploader.js";
import PingUploadWorker from "./worker.js";
import Policy from "./policy.js";
import uploadTaskFactory, { UploadTaskTypes } from "./task.js";

const LOG_TAG = "core.Upload.PingUploadManager";

export interface QueuedPing extends PingInternalRepresentation {
  // The UUID identifier for this ping.
  readonly identifier: string,
}

/**
 * A ping upload manager. Manages a queue of pending pings to upload.
 *
 * Observes the pings database
 * and whenever that is updated the newly recorded ping is enqueued.
 */
class PingUploadManager implements PingsDatabaseObserver {
  // A FIFO queue storing a `QueuedPing` for each pending ping.
  private queue: QueuedPing[];
  // A set of the identifiers of pings being processed
  // i.e. pings that were removed from the queue by calling `getUploadTask`,
  // but have not yet been deleted from the database / re-enqueued by calling `processPingUploadResponse`.
  private processing: Set<string>;
  // A worker that will take care of actually uploading pings.
  private worker: PingUploadWorker;

  // The number of times a recoverable failure has been processed by this.processPingUploadResponse.
  private recoverableFailureCount = 0;
  // The number of times this.getUploadTasks has returned a Wait_UploadTask in a row.
  private waitAttemptCount = 0;

  constructor(
    config: Configuration,
    private readonly pingsDatabase: PingsDatabase,
    private readonly policy = new Policy(),
    private readonly rateLimiter = new RateLimiter(),
  ) {
    this.queue = [];
    this.processing = new Set();

    this.worker = new PingUploadWorker(
      // Initialize the ping upload worker with either the platform defaults or a custom
      // provided uploader from the configuration object.
      config.httpClient ? config.httpClient : Context.platform.uploader,
      config.serverEndpoint,
      policy,
    );

    pingsDatabase.attachObserver(this);
  }

  /**
   * Enqueues a new ping at the end of the queue.
   *
   * Will not enqueue if a ping with the same identifier is already enqueued
   * or is currently being processed.
   *
   * @param ping The ping to enqueue.
   */
  private enqueuePing(ping: QueuedPing): void {
    if (this.processing.has(ping.identifier)) {
      return;
    }

    for (const queuedPing of this.queue) {
      if (queuedPing.identifier === ping.identifier) {
        return;
      }
    }

    this.queue.push(ping);
  }

  private getUploadTaskInternal(): UploadTask {
    if (this.recoverableFailureCount >= this.policy.maxRecoverableFailures) {
      log(
        LOG_TAG,
        "Glean has reached maximum recoverable upload failures for the current uploading window.",
        LoggingLevel.Debug
      );
      return uploadTaskFactory.done();
    }

    if (this.queue.length > 0) {
      const { state, remainingTime } = this.rateLimiter.getState();
      if (state === RateLimiterState.Throttled) {
        log(
          LOG_TAG,
          [
            "Glean is currently throttled.",
            `Pending pings may be uploaded in ${(remainingTime || 0) / 1000}s.`
          ],
          LoggingLevel.Debug
        );

        this.waitAttemptCount++;
        if (this.waitAttemptCount > this.policy.maxWaitAttempts) {
          return uploadTaskFactory.done();
        }

        return uploadTaskFactory.wait(remainingTime || 0);
      }

      // We are sure this array is not empty, so this will never return an `undefined` value.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const nextPing = this.queue.shift()!;
      this.processing.add(nextPing.identifier);

      return uploadTaskFactory.upload(nextPing);
    }

    return uploadTaskFactory.done();
  }

  /**
   * Get the next `UploadTask`.
   *
   * @returns The next upload task.
   */
  getUploadTask(): UploadTask {
    const nextTask = this.getUploadTaskInternal();

    if (nextTask.type !== UploadTaskTypes.Wait && this.waitAttemptCount > 0) {
      this.waitAttemptCount = 0;
    }

    if (nextTask.type !== UploadTaskTypes.Upload && this.recoverableFailureCount > 0) {
      this.recoverableFailureCount = 0;
    }

    return nextTask;
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
   * @param ping The ping that was just uploaded.
   * @param response The response of a ping upload attempt.
   * @returns Whether or not to retry the upload attempt.
   */
  async processPingUploadResponse(ping: QueuedPing, response: UploadResult): Promise<void> {
    const { identifier } = ping;
    this.processing.delete(identifier);

    const { status, result } = response;
    if (status && status >= 200 && status < 300) {
      log(LOG_TAG, `Ping ${identifier} succesfully sent ${status}.`, LoggingLevel.Info);
      await this.pingsDatabase.deletePing(identifier);
      return;
    }

    if (result === UploadResultStatus.UnrecoverableFailure || (status && status >= 400 && status < 500)) {
      log(
        LOG_TAG,
        `Unrecoverable upload failure while attempting to send ping ${identifier}. Error was: ${status ?? "no status"}.`,
        LoggingLevel.Warn
      );
      await this.pingsDatabase.deletePing(identifier);
      return;
    }

    log(
      LOG_TAG,
      [
        `Recoverable upload failure while attempting to send ping ${identifier}, will retry.`,
        `Error was: ${status ?? "no status"}.`
      ],
      LoggingLevel.Warn
    );
    this.recoverableFailureCount++;
    this.enqueuePing(ping);
  }

  /**
   * Clears the pending pings queue.
   *
   * # Important
   *
   * This will _drop_ pending pings still enqueued.
   * Only the `deletion-request` ping will still be processed.
   *
   * @returns A promise which resolves once the clearing is complete
   *          and all upload attempts have been exhausted.
   */
  async clearPendingPingsQueue(): Promise<void> {
    this.queue = this.queue.filter(ping => isDeletionRequest(ping));
    await this.blockOnOngoingUploads();
  }

  /**
   * Wait for uploading jobs to complete.
   *
   * This does not interfere in the jobs themselves.
   *
   * It the rate limit is hit, this will resolve without finishing to process everything.
   *
   * @returns A promise which resolves once current ongoing upload worker job is complete.
   *         This should not hang for too long because of the upload limitations.
   */
  async blockOnOngoingUploads(): Promise<void> {
    return this.worker.blockOnCurrentJob();
  }

  /**
   * Enqueues a new ping and trigger uploading of enqueued pings.
   *
   * This function is called by the PingDatabase everytime a new ping is added to the database
   * or when the database is being scanned.
   *
   * @param identifier The id of the ping that was just recorded.
   * @param ping An object containing the newly recorded ping path, payload and optionally headers.
   */
  update(identifier: string, ping: PingInternalRepresentation): void {
    this.enqueuePing({ identifier, ...ping });
    this.worker.work(
      () => this.getUploadTask(),
      (ping: QueuedPing, result: UploadResult) => this.processPingUploadResponse(ping, result)
    );
  }
}

export default PingUploadManager;
