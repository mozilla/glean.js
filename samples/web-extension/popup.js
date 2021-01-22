/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

// Let the background script know the pop up has been opened.
browser.runtime.sendMessage("popup-opened");

const sendAPingButton = document.getElementById("send-ping");
sendAPingButton.addEventListener("click", async () => {
  // Tell the background script to upload a ping
  browser.runtime.sendMessage("send-ping");
}, { passive: true });
