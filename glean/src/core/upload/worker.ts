/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { QueuedPing } from "./manager.js";
import type Uploader from "./uploader.js";
import type { UploadTask } from "./task.js";

import { Context } from "../context.js";
import log, { LoggingLevel } from "../log.js";
import Policy from "./policy.js";
import { UploadResult, UploadResultStatus } from "./uploader.js";
import { UploadTaskTypes } from "./task.js";
import { GLEAN_VERSION } from "../constants.js";
import { PingBodyOverflowError } from "./ping_body_overflow_error.js";
import PingRequest from "./ping_request.js";

const PING_UPLOAD_WORKER_LOG_TAG = "core.Upload.PingUploadWorker";

class PingUploadWorker {
  // Whether or not someone is blocking on the currentJob.
  isBlocking = false;

  constructor(
    private readonly uploader: Uploader,
    private readonly serverEndpoint: string,
    private readonly policy = new Policy()
  ) { }

  /**
   * Builds a ping request.
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
  private buildPingRequest(ping: QueuedPing): PingRequest<string | Uint8Array> {
    let headers = ping.headers || {};
    headers = {
      ...ping.headers,
      "Content-Type": "application/json; charset=utf-8",
      Date: new Date().toISOString(),
      "X-Telemetry-Agent": `Glean/${GLEAN_VERSION} (JS on ${(Context.platform).info.os()})`
    };

    const stringifiedBody = JSON.stringify(ping.payload);

    if (stringifiedBody.length > this.policy.maxPingBodySize) {
      throw new PingBodyOverflowError(
        `Body for ping ${ping.identifier} exceeds ${this.policy.maxPingBodySize}bytes. Discarding.`
      );
    }

    headers["Content-Length"] = stringifiedBody.length.toString();
    return new PingRequest(ping.identifier, headers, stringifiedBody, this.policy.maxPingBodySize);
  }

  /**
   * Attempts to upload a ping.
   *
   * @param ping The ping object containing headers and payload.
   * @returns The status number of the response or `undefined` if unable to attempt upload.
   */
  private async attemptPingUpload(ping: QueuedPing): Promise<UploadResult> {
    try {
      const finalPing = this.buildPingRequest(ping);

      let safeUploader = this.uploader;
      if (!this.uploader.supportsCustomHeaders()) {
        // Some options require us to submit custom headers. Unfortunately not all the
        // uploaders support them (e.g. `sendBeacon`). In case headers are required, switch
        // back to the default uploader that, for now, supports headers.
        const needsHeaders = !(
          (Context.config.sourceTags === undefined) && (Context.config.debugViewTag === undefined)
        );
        if (needsHeaders) {
          safeUploader = Context.platform.uploader;
        }
      }

      // The POST call has to be asynchronous. Once the API call is triggered,
      // we rely on the browser's "keepalive" header.
      return safeUploader.post(
        `${this.serverEndpoint}${ping.path}`,
        finalPing
      );
    } catch (e) {
      log(
        PING_UPLOAD_WORKER_LOG_TAG,
        ["Error trying to build or post ping request:", e],
        LoggingLevel.Warn
      );
      // An unrecoverable failure will make sure the offending ping is removed from the queue and
      // deleted from the database, which is what we want here.
      return new UploadResult(UploadResultStatus.UnrecoverableFailure);
    }
  }

  /**
   * Kick start non-blocking asynchronous internal loop to get and act on upload tasks.
   *
   * If a job is currently ongoing, this is a no-op.
   *
   * @param getUploadTask A function that returns an UploadTask.
   * @param processUploadResponse A function that processes an UploadResponse.
   */
  work(
    getUploadTask: () => UploadTask,
    processUploadResponse: (ping: QueuedPing, result: UploadResult) => void
  ): void {
    while (true) {
      try {
        const task = getUploadTask();
        switch (task.type) {
        case UploadTaskTypes.Upload: {
          if (this.isBlocking) {
            return;
          }

          this.attemptPingUpload(task.ping)
            .then((result) => {
              processUploadResponse(task.ping, result);
            })
            .catch((error) => {
              console.log(error);
            });
          continue;
        }

        case UploadTaskTypes.Done:
          return;
        }
      } catch (error) {
        log(
          PING_UPLOAD_WORKER_LOG_TAG,
          ["IMPOSSIBLE: Something went wrong while processing ping upload tasks.", error],
          LoggingLevel.Error
        );
      }
    }
  }

  /**
   * Block the uploader from uploading pings.
   */
  blockUploading() {
    this.isBlocking = true;
  }

  /**
   * Resume the uploader to upload pings.
   */
  resumeUploading() {
    this.isBlocking = false;
  }
}

export default PingUploadWorker;
