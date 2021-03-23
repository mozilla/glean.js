/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "@mozilla/glean/webext";
import { custom } from "./generated/pings.js";
import PingEncryptionPlugin from "@mozilla/glean/webext/plugins/encryption";
import { webextStarted, popupOpened } from "./generated/sample.js";

const CORE_ENCRYPTION_JWK = {
  "crv": "P-256",
  "kid": "core",
  "kty": "EC",
  "x": "muvXFcGjbk2uZCCa8ycoH8hVxeDCGPQ9Ed2-QHlTtuc",
  "y": "xrLUev8_yUrSFAlabnHInvU4JKc6Ew3YXaaoDloQxw8",
};

Glean.initialize("web-extension", true, {
  debug: { logPings: true },
  plugins: [
    new PingEncryptionPlugin(CORE_ENCRYPTION_JWK)
  ]
});
webextStarted.set();

// Listen for messages from the popup.
browser.runtime.onMessage.addListener(msg => {
  console.log(`New message received! ${msg}`);

  if (msg === "popup-opened") {
    popupOpened.add();
  }

  if (msg === "send-ping") {
    custom.submit();
  }
});

