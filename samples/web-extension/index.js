/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "glean";
import { samplePing } from "./generatedPings";
import { webExtStarted, popupOpened } from "./generatedMetrics";


Glean.initialize("web-extension", true);
webExtStarted.set();

// Listen for messages from the popup.
browser.runtime.onMessage.addListener(msg => {
  console.log(`New message received! ${msg}`);

  if (msg === "popup-opened") {
    popupOpened.add();
  }

  if (msg === "send-ping") {
    samplePing.submit();
  }
});

