/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gzipSync, strToU8 } from "fflate";

import type { QueuedPing } from "./manager";
import type Uploader from "./uploader.js";
import type { UploadTask} from "./task.js";
import { GLEAN_VERSION } from "../constants.js";
import { Context } from "../context.js";
import log, { LoggingLevel } from "../log.js";
import Policy from "./policy.js";
import { UploadResult, UploadResultStatus } from "./uploader.js";
import { UploadTaskTypes } from "./task.js";

const LOG_TAG = "core.Upload.PingUploadWorker";

// Error to be thrown in case the final ping body is larger than MAX_PING_BODY_SIZE.
class PingBodyOverflowError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "PingBodyOverflow";
  }
}

class PingUploadWorker {
  private currentJob?: Promise<void>;

  constructor (
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
  private async buildPingRequest(ping: QueuedPing): Promise<{
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
      "X-Telemetry-Agent": `Glean/${GLEAN_VERSION} (JS on ${await Context.platform.info.os()})`
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
    try {
      const finalPing = await this.buildPingRequest(ping);
      return await this.uploader.post(
        `${this.serverEndpoint}${ping.path}`,
        finalPing.payload,
        finalPing.headers
      );
    } catch(e) {
      log(LOG_TAG, [ "Error trying to build or post ping request:", e ], LoggingLevel.Warn);
      // An unrecoverable failure will make sure the offending ping is removed from the queue and
      // deleted from the database, which is what we want here.
      return new UploadResult(UploadResultStatus.UnrecoverableFailure);
    }
  }

  /**
   * Start a loop to get queued pings and attempt upload.
   *
   * @param getUploadTask A function that returns an UploadTask.
   * @param processUploadResponse A function that processes an UploadResponse.
   * @returns A promise whihc resolves on a Done_UploadTask is received.
   */
  private async workInternal(
    getUploadTask: () => UploadTask,
    processUploadResponse: (ping: QueuedPing, result: UploadResult) => Promise<void>,
  ): Promise<void> {
    while(true) {
      const nextTask = getUploadTask();
      switch (nextTask.type) {
      case UploadTaskTypes.Upload:
        const result = await this.attemptPingUpload(nextTask.ping);
        await processUploadResponse(nextTask.ping, result);
        continue;
      // TODO(bug1727076): Actually set a timer to continue once timeout is complete.
      // Note that the timer must be cleared in case an abort signal is issued.
      case UploadTaskTypes.Wait:
      case UploadTaskTypes.Done:
        return;
      }
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
    processUploadResponse: (ping: QueuedPing, result: UploadResult) => Promise<void>,
  ): void {
    if (!this.currentJob) {
      this.currentJob = this.workInternal(getUploadTask, processUploadResponse)
        .then(() => {
          this.currentJob = undefined;
        })
        .catch(error => {
          log(
            LOG_TAG,
            [ "IMPOSSIBLE: Something went wrong while processing ping upload tasks.", error ],
            LoggingLevel.Error
          );
        });
    }
  }

  /**
   * Allows to wait for current job completion.
   *
   * # Warning
   *
   * Use only at times when you know it is not possible for this to hang too long
   * i.e. at times when you know how many pings are enqueued.
   *
   * @returns A promise which resolves once the current ongoing job is complete.
   *          If there is no ongoing job, the returned promise will resolve immediately.
   */
  async blockOnCurrentJob() {
    if (this.currentJob) {
      return this.currentJob;
    }

    return Promise.resolve();
  }
}

export default PingUploadWorker;
