/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import log, { LoggingLevel } from "../../core/log.js";
import Uploader from "../../core/upload/uploader.js";
import { DEFAULT_UPLOAD_TIMEOUT_MS, UploadResultStatus, UploadResult } from "../../core/upload/uploader.js";
import { isString } from "../../core/utils.js";

const LOG_TAG = "platform.qt.Uploader";

class QtUploader extends Uploader {
  async post(url: string, body: string | Uint8Array, headers: Record<string, string> = {}): Promise<UploadResult> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = DEFAULT_UPLOAD_TIMEOUT_MS;
      xhr.open("POST", url);

      for (const header in headers) {
        xhr.setRequestHeader(header, headers[header]);
      }

      xhr.ontimeout = function(e) {
        log(LOG_TAG, ["Timeout while attempting to upload ping.\n", e.type], LoggingLevel.Error);
        resolve(new UploadResult(UploadResultStatus.RecoverableFailure));
      };

      xhr.onerror = function(e) {
        log(LOG_TAG, ["Network error while attempting to upload ping.\n", e.type], LoggingLevel.Error);
        resolve(new UploadResult(UploadResultStatus.RecoverableFailure));
      };

      xhr.onabort = function (e) {
        log(LOG_TAG, ["The attempt to upload ping is aborted.\n", e.type], LoggingLevel.Error);
        resolve(new UploadResult(UploadResultStatus.RecoverableFailure));
      };

      xhr.onload = () => {
        resolve(new UploadResult(UploadResultStatus.Success, xhr.status));
      };

      if (!isString(body)) {
        xhr.send(body.buffer);
      } else {
        xhr.send(body);
      }
    });
  }
}

export default new QtUploader();
