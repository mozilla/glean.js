/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import https from "https";
import http from "http";

import log, { LoggingLevel } from "../../core/log.js";
import Uploader, {
  UploadResult,
  UploadResultStatus,
  DEFAULT_UPLOAD_TIMEOUT_MS
} from "../../core/upload/uploader.js";

const LOG_TAG = "platform.node.Uploader";

class NodeUploader extends Uploader {
  post(url: string, body: string | Uint8Array, headers?: Record<string, string>): Promise<UploadResult> {
    return new Promise(resolve => {
      // We can trust that the URL is valid,
      // since it is validated upon Glean initialzation
      // TODO: Bug 1730496
      const parsedURL = new URL(url);
      const mod = parsedURL.protocol === "http:" ? http : https;
      const request = mod.request(
        {
          hostname: parsedURL.hostname,
          path: parsedURL.pathname,
          port: parsedURL.port,
          headers,
          method: "POST",
          timeout: DEFAULT_UPLOAD_TIMEOUT_MS
        },
        response => {
          response.resume();
          response.once("end", () => {
            resolve(new UploadResult(UploadResultStatus.Success, response.statusCode));
          });
        }
      );

      request.on("timeout", () => {
        log(LOG_TAG, "Timeout while attempting to upload ping.", LoggingLevel.Error);
        resolve(new UploadResult(UploadResultStatus.RecoverableFailure));
      });

      request.on("error", error => {
        log(
          LOG_TAG,
          [ "Network error while attempting to upload ping.\n", error.message ],
          LoggingLevel.Error
        );
        resolve(new UploadResult(UploadResultStatus.RecoverableFailure));
      });

      // Finish sending the request.
      request.end(body);
    });
  }
}

export default new NodeUploader();
