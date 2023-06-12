/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Configuration } from "../../config.js";
import type { PingInternalRepresentation } from "../../pings/database/shared.js";
import type PingsDatabase from "../../pings/database/async.js";
import type { UploadResult } from "../uploader.js";
import type { UploadTask } from "../task.js";
import type { IPingUploadManager, QueuedPing } from "./shared.js";

import { Context } from "../../context.js";
import log, { LoggingLevel } from "../../log.js";
import { isDeletionRequest } from "../../pings/database/shared.js";
import RateLimiter, { RateLimiterState } from "../rate_limiter.js";
import { UploadResultStatus } from "../uploader.js";
import PingUploadWorker from "../worker/async.js";
import Policy from "../policy.js";
import uploadTaskFactory, { UploadTaskTypes } from "../task.js";
import { UPLOAD_MANAGER_LOG_TAG } from "./shared.js";

// See `IPingUploadManager` for method documentation.
class PingUploadManager implements IPingUploadManager {
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
    private readonly rateLimiter = new RateLimiter()
  ) {
    this.queue = [];
    this.processing = new Set();

    this.worker = new PingUploadWorker(
      // Initialize the ping upload worker with either the platform defaults or a custom
      // provided uploader from the configuration object.
      config.httpClient ? config.httpClient : Context.platform.uploader,
      config.serverEndpoint,
      policy
    );

    pingsDatabase.attachObserver(this);
  }

  /// PUBLIC ///
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

  async processPingUploadResponse(ping: QueuedPing, response: UploadResult): Promise<void> {
    const { identifier } = ping;
    this.processing.delete(identifier);

    const { status, result } = response;
    if (status && status >= 200 && status < 300) {
      log(
        UPLOAD_MANAGER_LOG_TAG,
        `Ping ${identifier} successfully sent ${status}.`,
        LoggingLevel.Info
      );
      await this.pingsDatabase.deletePing(identifier);
      return;
    }

    if (
      result === UploadResultStatus.UnrecoverableFailure ||
      (status && status >= 400 && status < 500)
    ) {
      log(
        UPLOAD_MANAGER_LOG_TAG,
        `Unrecoverable upload failure while attempting to send ping ${identifier}. Error was: ${
          status ?? "no status"
        }.`,
        LoggingLevel.Warn
      );
      await this.pingsDatabase.deletePing(identifier);
      return;
    }

    log(
      UPLOAD_MANAGER_LOG_TAG,
      [
        `Recoverable upload failure while attempting to send ping ${identifier}, will retry.`,
        `Error was: ${status ?? "no status"}.`
      ],
      LoggingLevel.Warn
    );
    this.recoverableFailureCount++;
    this.enqueuePing(ping);
  }

  async clearPendingPingsQueue(): Promise<void> {
    this.queue = this.queue.filter((ping) => isDeletionRequest(ping));
    await this.blockOnOngoingUploads();
  }

  async blockOnOngoingUploads(): Promise<void> {
    return this.worker.blockOnCurrentJob();
  }

  update(identifier: string, ping: PingInternalRepresentation): void {
    this.enqueuePing({ identifier, ...ping });
    this.worker.work(
      () => this.getUploadTask(),
      (ping: QueuedPing, result: UploadResult) => this.processPingUploadResponse(ping, result)
    );
  }

  /// PRIVATE ///
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
        UPLOAD_MANAGER_LOG_TAG,
        "Glean has reached maximum recoverable upload failures for the current uploading window.",
        LoggingLevel.Debug
      );
      return uploadTaskFactory.done();
    }

    if (this.queue.length > 0) {
      const { state, remainingTime } = this.rateLimiter.getState();
      if (state === RateLimiterState.Throttled) {
        log(
          UPLOAD_MANAGER_LOG_TAG,
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
}

export default PingUploadManager;
