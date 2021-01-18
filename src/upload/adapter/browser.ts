/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { UploadResult, UploadResultStatus } from "upload";
import { UploadAdapter } from ".";

class BrowserUploadAdapter extends UploadAdapter {
  async post(url: URL, body: string, headers: Record<string, string> = {}): Promise<UploadResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.defaultTimeout);

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
        console.error("Timeout while attempting to upload ping.", e);
      } else if (e instanceof TypeError) {
        // From MDN: "A fetch() promise will reject with a TypeError
        // when a network error is encountered or CORS is misconfigured on the server-side,
        // although this usually means permission issues or similar"
        // See: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch#checking_that_the_fetch_was_successful
        //
        // We will treat this as we treat server / network errors in this case.
        console.error("Network while attempting to upload ping.", e);
      } else {
        console.error("Unknown error while attempting to upload ping.", e);
      }

      clearTimeout(timeout);
      return { result: UploadResultStatus.RecoverableFailure };
    }

    clearTimeout(timeout);
    return {
      result: UploadResultStatus.Success,
      status: (await response.json()).status
    };
  }
}

export default new BrowserUploadAdapter();
