/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gunzipSync } from "fflate";

import type { JSONObject } from "../src/core/utils";
import type PingRequest from "../src/core/upload/ping_request";
import { isString } from "../src/core/utils";
import Uploader from "../src/core/upload/uploader";
import { UploadResultStatus, UploadResult } from "../src/core/upload/uploader";
import Glean from "../src/core/glean.js";

/**
 * Decoded, unzips and parses the ping payload into a JSON object.
 *
 * @param payload The payload to process.
 * @returns The processed payload.
 */
export function unzipPingPayload(payload: Uint8Array | string): JSONObject {
  let parsedBody: JSONObject;
  if (!isString(payload)) {
    const decoder = new TextDecoder("utf8");
    parsedBody = JSON.parse(decoder.decode(gunzipSync(payload))) as JSONObject;
  } else {
    parsedBody = JSON.parse(payload) as JSONObject;
  }
  return parsedBody;
}

/**
 * Disables the uploading on the Glean singleton,
 * so that it doesn't interfere with tests.
 */
export function stopGleanUploader(): void {
  Glean.pingUploader.blockUploads();
}

/**
 * Enables the uploading on the Glean singleton.
 */
export function resumeGleanUploader(): void {
  Glean.pingUploader.resumeUploads();
}

/**
 * A Glean mock HTTP which allows one to wait for a specific ping submission.
 */
export class WaitableUploader extends Uploader {
  private waitingForName?: string;
  private waitingForPath?: string;
  private waitingForCount?: number;

  private waitResolver?: (pingBody?: JSONObject, headers?: Record<string, string>) => void;
  private batchResult: JSONObject[] = [];

  private reset(): void {
    this.waitingForName = undefined;
    this.waitingForPath = undefined;
    this.waitingForCount = undefined;
    this.batchResult = [];
  }

  /**
   * Returns a promise that resolves once a ping is submitted a given number of times
   * or times out after a 2s wait.
   *
   * @param name The name of the ping to wait for.
   * @param count The amount of times we expect the ping to be uploaded.
   * @returns The body of the submitted pings, in the order they were submitted.
   */
  waitForBatchPingSubmission(name: string, count: number): Promise<JSONObject[]> {
    this.waitingForName = name;
    this.waitingForCount = count;
    return new Promise<JSONObject[]>((resolve, reject) => {
      const rejectTimeout = setTimeout(reject, 1500);

      this.waitResolver = () => {
        clearTimeout(rejectTimeout);

        const result = this.batchResult;
        this.reset();
        // Uncomment for debugging the ping payload.
        // console.log(JSON.stringify(result, null, 2));
        resolve(result);
      };
    });
  }

  /**
   * Returns a promise that resolves once a ping is submitted or times out after a 2s wait.
   *
   * @param name The name of the ping to wait for.
   * @param path The expected path of the ping to wait for.
   * @param includeHeaders Whether or not to include headers in response object. Defaults to false.
   * @returns The body of the submitted ping.
   */
  waitForPingSubmission(name: string, path?: string, includeHeaders = false): Promise<JSONObject> {
    this.waitingForName = name;
    this.waitingForPath = path;
    return new Promise<JSONObject>((resolve, reject) => {
      const rejectTimeout = setTimeout(reject, 1500);

      this.waitResolver = (pingBody?: JSONObject, headers?: Record<string, string>) => {
        clearTimeout(rejectTimeout);

        this.reset();
        // Uncomment for debugging the ping payload.
        // console.log(JSON.stringify(pingBody, null, 2));

        if (includeHeaders) {
          resolve({ body: pingBody as JSONObject, headers: headers as Record<string, string> });
        } else {
          resolve(pingBody as JSONObject);
        }
      };
    });
  }

  async post(url: string, pingRequest: PingRequest<string | Uint8Array>): Promise<UploadResult> {
    // Make this a tiny bit slow to mimic reality a bit better.
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), Math.random() * 10);
    });

    const containsPath = this.waitingForPath && url.includes(this.waitingForPath);
    const containsName = this.waitingForName && url.includes(this.waitingForName);

    if (containsName || containsPath) {
      if (this.waitingForCount) {
        this.batchResult.push(unzipPingPayload(pingRequest.payload));
        if (this.batchResult.length >= this.waitingForCount) {
          this.waitResolver?.();
        }
      } else {
        this.waitResolver?.(unzipPingPayload(pingRequest.payload), pingRequest.headers);
      }
    }

    return Promise.resolve(new UploadResult(UploadResultStatus.Success, 200));
  }

  supportsCustomHeaders(): boolean {
    return true;
  }
}

/**
 * Uploader implementation that counts how many times `post` was called.
 */
export class CounterUploader extends Uploader {
  public count = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async post(_url: string, _pingRequest: PingRequest<string | Uint8Array>): Promise<UploadResult> {
    this.count++;
    // Make this just a tiny bit slow.
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), 10 * Math.random());
    });

    return {
      status: 200,
      result: UploadResultStatus.Success
    };
  }

  supportsCustomHeaders(): boolean {
    return true;
  }
}
