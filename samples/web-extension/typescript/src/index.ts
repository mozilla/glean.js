/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "@mozilla/glean/webext";
import { custom } from "./generated/pings";
import { webextStarted, popupOpened } from "./generated/sample";

Glean.initialize("web-extension", true, { debug: { logPings: true }});
webextStarted.set();

// Listen for messages from the popup.
browser.runtime.onMessage.addListener((msg: any) => {
  console.log(`New message received! ${msg}`);

  if (msg === "popup-opened") {
    popupOpened.add();
  }

  if (msg === "send-ping") {
    custom.submit();
  }
});

