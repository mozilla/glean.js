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
import { Context } from "../../core/context.js";

const LOG_TAG = "platform.browser.SendBeaconFallbackUploader";

class BrowserSendBeaconFallbackUploader extends Uploader {
  fetchUploader = BrowserFetchUploader;
  sendBeaconUploader = BrowserSendBeaconUploader;

  // eslint-disable-next-line @typescript-eslint/require-await
  async post(
    url: string,
    pingRequest: PingRequest<string | Uint8Array>
  ): Promise<UploadResult> {

    // Some options require us to submit custom headers. Unfortunately not all the
    // uploaders support them (e.g. `sendBeacon`). In case headers are required, switch
    // back to the `fetch` uploader that supports headers.
    // Then try `sendBeacon` first,
    // fall back to `fetch` if `sendBeacon` reports an error or `sendBeacon` is
    // not defined.
    const hasNoCustomHeaders = !Context.config?.sourceTags && !Context.config?.debugViewTag;

    if (hasNoCustomHeaders && !!navigator && !!navigator.sendBeacon) {
      const beaconStatus = await this.sendBeaconUploader.post(url, pingRequest, false);
      if (beaconStatus.result == UploadResultStatus.Success) {
        return beaconStatus;
      }
      log(LOG_TAG, "The `sendBeacon` call was not serviced by the browser. Falling back to the `fetch` uploader.", LoggingLevel.Warn);
    } else {
      log(LOG_TAG, "`sendBeacon` is not available. Falling back to the `fetch` uploader.", LoggingLevel.Warn);
    }

    return this.fetchUploader.post(url, pingRequest);
  }

  supportsCustomHeaders(): boolean {
    return false;
  }
}

export default new BrowserSendBeaconFallbackUploader();
