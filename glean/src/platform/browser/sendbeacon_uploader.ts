/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type PingRequest from "../../core/upload/ping_request.js";

import log, { LoggingLevel } from "../../core/log.js";
import Uploader from "../../core/upload/uploader.js";
import { DEFAULT_UPLOAD_TIMEOUT_MS, UploadResultStatus, UploadResult } from "../../core/upload/uploader.js";

const LOG_TAG = "platform.browser.SendBeaconUploader";

class BrowserSendBeaconUploader extends Uploader {
  timeoutMs: number = DEFAULT_UPLOAD_TIMEOUT_MS;

  // eslint-disable-next-line @typescript-eslint/require-await
  async post(
    url: string,
    pingRequest: PingRequest<string | Uint8Array>
  ): Promise<UploadResult> {
    // While the most appropriate type would be "application/json",
    // using that would cause to send CORS preflight requests. We
    // instead send the content as plain text and rely on the backend
    // to do the appropriate validation/parsing.
    const wasQueued = navigator.sendBeacon(url, pingRequest.payload);
    if (wasQueued) {
      // Unfortunately we don't know much more other than data was enqueued,
      // it is the agent's responsibility to manage the submission. The only
      // thing we can do is remove this from our internal queue.
      return new UploadResult(UploadResultStatus.Success, 200);
    }
    log(LOG_TAG, "The `sendBeacon` call was not serviced by the browser. Deleting data.", LoggingLevel.Error);
    // If the agent says there's a problem, there's not so much we can do.
    return new UploadResult(UploadResultStatus.UnrecoverableFailure);
  }
}

export default new BrowserSendBeaconUploader();
