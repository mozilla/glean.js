/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

document.addEventListener("test", async (event) => {
  console.debug("Caught a new test event on the web extension!");
  try {
    const response = await browser.runtime.sendMessage({
      test: event.detail
    });
    document.dispatchEvent(new CustomEvent("testResponse", {
      detail: response.data
    }));
  } catch (e) {
    console.error("Something went wrong while talking to the background script.", e);
  }
});
