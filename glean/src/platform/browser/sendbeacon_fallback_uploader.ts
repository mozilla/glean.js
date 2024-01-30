/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type PingRequest from "../../core/upload/ping_request.js";

import log, { LoggingLevel } from "../../core/log.js";
import Uploader from "../../core/upload/uploader.js";
import BrowserFetchUploader from "./fetch_uploader.js";
import BrowserSendBeaconUploader from "./sendbeacon_uploader.js";
import { UploadResultStatus } from "../../core/upload/uploader.js";
import type { UploadResult } from "../../core/upload/uploader.js";

const LOG_TAG = "platform.browser.SendBeaconFallbackUploader";

class BrowserSendBeaconFallbackUploader extends Uploader {
  fetchUploader = BrowserFetchUploader;
  sendBeaconUploader = BrowserSendBeaconUploader;

  // eslint-disable-next-line @typescript-eslint/require-await
  async post(
    url: string,
    pingRequest: PingRequest<string | Uint8Array>
  ): Promise<UploadResult> {

    // Try `sendBeacon` first,
    // fall back to `fetch` if `sendBeacon` reports an error.
    const beaconStatus = await this.sendBeaconUploader.post(url, pingRequest);
    if (beaconStatus.result == UploadResultStatus.Success) {
      return beaconStatus;
    }
    log(LOG_TAG, "The `sendBeacon` call was not serviced by the browser. Falling back to the fetch uploader.", LoggingLevel.Warn);

    return this.fetchUploader.post(url, pingRequest);
  }

  supportsCustomHeaders(): boolean {
    return false;
  }
}

export default new BrowserSendBeaconFallbackUploader();
