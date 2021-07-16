/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gunzipSync } from "fflate";

import type { JSONObject } from "../src/core/utils";
import { isString } from "../src/core/utils";
import type { Uploader, UploadResult } from "../src/core/upload/uploader";
import { UploadResultStatus } from "../src/core/upload/uploader";

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
 * A Glean mock HTTP which allows one to wait for a specific ping submission.
 */
class WaitableUploader implements Uploader {
  private waitingForName?: string;
  private waitingForPath? : string;
  private waitResolver?: (pingBody: JSONObject) => void;

  /**
   * Returns a promise that resolves once a ping is submitted or times out after a 2s wait.
   *
   * @param name The name of the ping to wait for.
   * @param path The expected path of the ping to wait for.
   * @returns A promise that resolves once a ping is submitted or times out after a 2s wait.
   */
  waitForPingSubmission(name: string, path?: string): Promise<JSONObject> {
    this.waitingForName = name;
    this.waitingForPath = path;
    return new Promise<JSONObject>((resolve, reject) => {
      this.waitResolver = (pingBody: JSONObject) => {
        this.waitingForName = undefined;
        this.waitingForPath = undefined;
        // Uncomment for debugging the ping payload.
        // console.log(JSON.stringify(pingBody, null, 2));
        resolve(pingBody);
      };

      setTimeout(() => reject(), 2000);
    });
  }

  post(url: string, body: string): Promise<UploadResult> {
    if (this.waitingForPath) {
      if (url.includes(this.waitingForPath)) {
        this.waitResolver?.(unzipPingPayload(body));
      } else {
        return Promise.reject(new Error("The submitted ping is not from the url we are waiting for."));
      }
    } else if (this.waitingForName && url.includes(this.waitingForName)) {
      this.waitResolver?.(unzipPingPayload(body));
    }

    return Promise.resolve({
      result: UploadResultStatus.Success,
      status: 200
    });
  }
}

export default WaitableUploader;