/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gzipSync, strToU8 } from "fflate";

import type { QueuedPing } from "../manager/shared.js";
import type Uploader from "../uploader.js";
import type { UploadTask } from "../task.js";
import { GLEAN_VERSION } from "../../constants.js";
import { Context } from "../../context.js";
import log, { LoggingLevel } from "../../log.js";
import Policy from "../policy.js";
import { UploadResult, UploadResultStatus } from "../uploader.js";
import { UploadTaskTypes } from "../task.js";
import type PlatformSync from "../../../platform/sync.js";
import { PingBodyOverflowError, PING_UPLOAD_WORKER_LOG_TAG } from "./shared.js";

class PingUploadWorkerSync {
  constructor(
    private readonly uploader: Uploader,
    private readonly serverEndpoint: string,
    private readonly policy = new Policy()
  ) {}

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
  private buildPingRequest(ping: QueuedPing): {
    headers: Record<string, string>;
    payload: string | Uint8Array;
  } {
    let headers = ping.headers || {};
    headers = {
      ...ping.headers,
      "Content-Type": "application/json; charset=utf-8",
      Date: new Date().toISOString(),
      "X-Telemetry-Agent": `Glean/${GLEAN_VERSION} (JS on ${(
        Context.platform as PlatformSync
      ).info.os()})`
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
    // TODO
    // Update this to ignore the API response since we cannot handle
    // it synchronously.
    try {
      const finalPing = this.buildPingRequest(ping);
      return this.uploader.post(
        `${this.serverEndpoint}${ping.path}`,
        finalPing.payload,
        finalPing.headers
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
    try {
      const task = getUploadTask();
      switch (task.type) {
      case UploadTaskTypes.Upload:
        // TODO
        // Because we cannot await this response always, we need to delete the ping
        // data BEFORE the ping is sent.
        this.attemptPingUpload(task.ping)
          .then((result) => {
            processUploadResponse(task.ping, result);
          })
          .catch((error) => {
            console.log(error);
          });
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

export default PingUploadWorkerSync;
