/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import log, { LoggingLevel } from "../../core/log.js";
import Uploader from "../../core/upload/uploader.js";
import { DEFAULT_UPLOAD_TIMEOUT_MS, UploadResultStatus, UploadResult } from "../../core/upload/uploader.js";

const LOG_TAG = "platform.webext.Uploader";

class BrowserUploader extends Uploader {
  async post(url: string, body: string | Uint8Array, headers: Record<string, string> = {}): Promise<UploadResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_UPLOAD_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url.toString(), {
        headers,
        method: "POST",
        body: body,
        keepalive: true,
        // Strips any cookies or authorization headers from the request.
        credentials: "omit",
        signal: controller.signal,
        redirect: "error",
      });
    } catch(e) {
      // If we time out and call controller.abort,
      // the fetch API will throw a DOMException with name "AbortError".
      if (e instanceof DOMException) {
        log(LOG_TAG, ["Timeout while attempting to upload ping.\n", e.message], LoggingLevel.Error);
      } else if (e instanceof TypeError) {
        // From MDN: "A fetch() promise will reject with a TypeError
        // when a network error is encountered or CORS is misconfigured on the server-side,
        // although this usually means permission issues or similar"
        // See: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful
        //
        // We will treat this as we treat server / network errors in this case.
        log(LOG_TAG, ["Network error while attempting to upload ping.\n", e.message], LoggingLevel.Error);
      } else {
        log(LOG_TAG, ["Unknown error while attempting to upload ping.\n", JSON.stringify(e)], LoggingLevel.Error);
      }

      clearTimeout(timeout);
      return new UploadResult(UploadResultStatus.RecoverableFailure);
    }

    clearTimeout(timeout);
    return new UploadResult(UploadResultStatus.Success, response.status);
  }
}

export default new BrowserUploader();
