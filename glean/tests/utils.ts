/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gunzipSync } from "fflate";

import type { JSONObject } from "../src/core/utils";
import { isString } from "../src/core/utils";
import Uploader from "../src/core/upload/uploader";
import { UploadResultStatus, UploadResult } from "../src/core/upload/uploader";
import Glean from "../src/core/glean";

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
 * so that it doesn't interefe with tests.
 */
export function stopGleanUploader(): void {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  Glean.pingUploader["worker"]["work"] = () => {};
}

/**
 * A Glean mock HTTP which allows one to wait for a specific ping submission.
 */
export class WaitableUploader extends Uploader {
  private waitingForName?: string;
  private waitingForPath?: string;
  private waitingForCount?: number;

  private waitResolver?: (pingBody?: JSONObject) => void;
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
      const rejectTimeout = setTimeout(() => {console.log("YEAH BYE"); reject();}, 1500);

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
   * @returns The body of the submitted ping.
   */
  waitForPingSubmission(name: string, path?: string): Promise<JSONObject> {
    this.waitingForName = name;
    this.waitingForPath = path;
    return new Promise<JSONObject>((resolve, reject) => {
      const rejectTimeout = setTimeout(() => reject(), 1500);

      this.waitResolver = (pingBody?: JSONObject) => {
        clearTimeout(rejectTimeout);

        this.reset();
        // Uncomment for debugging the ping payload.
        console.log(JSON.stringify(pingBody, null, 2));
        resolve(pingBody as JSONObject);
      };

      setTimeout(() => reject(), 1000);
    });
  }

  async post(url: string, body: string): Promise<UploadResult> {
    // Make this a tiny bit slow to mimic reality a bit better.
    await new Promise<void>(resolve => {
      setTimeout(() => resolve(), Math.random() * 10);
    });

    const containsPath = this.waitingForPath && url.includes(this.waitingForPath);
    const containsName = this.waitingForName && url.includes(this.waitingForName);

    if (containsName || containsPath) {
      if (this.waitingForCount) {
        this.batchResult.push(unzipPingPayload(body));
        if (this.batchResult.length >= this.waitingForCount) {
          this.waitResolver?.();
        }
      } else {
        this.waitResolver?.(unzipPingPayload(body));
      }
    }

    return Promise.resolve(new UploadResult(UploadResultStatus.Success, 200));
  }
}

/**
 * Uploader implementation that counts how many times `post` was called.
 */
export class CounterUploader extends Uploader {
  public count = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async post(_url: string, _body: string): Promise<UploadResult> {
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
}
