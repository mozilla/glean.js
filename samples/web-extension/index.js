/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "glean";
import { samplePing } from "./generatedPings";
import { webExtStarted, popupOpened } from "./generatedMetrics";

// TODO: Do not wait for Glean to be initialized before recording metrics
// once Bug 1687491 is resolved.
Glean.initialize("web-extension", true)
  .then(() => {
    console.log("Glean has been succesfully initialized.");
    webExtStarted.set()
      .then(() => console.log("`webext-installed` was succesfully set."));
  });

// Listen for messages from the popup.
browser.runtime.onMessage.addListener(msg => {
  console.log(`New message received! ${msg}`);

  if (msg === "popup-opened") {
    popupOpened.add()
      .then(() => console.log("`popup-opened` was succesfully added."));
  }

  if (msg === "send-ping") {
    samplePing.submit()
      .then(wasSubmitted => {
        console.log(
          `Attempted to send ping "${samplePing.name}". Was the ping sent? ${wasSubmitted}`);
      });
  }
});

