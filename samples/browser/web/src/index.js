/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "@mozilla/glean/web";
import { submission } from "./generated/pings.js";
import * as metrics from "./generated/sample.js";

Glean.setLogPings(true);
Glean.setDebugViewTag("glean-from-website");
Glean.initialize("glean-sample-website", true, { serverEndpoint: "https://cors-anywhere.herokuapp.com/corsdemo/https://incoming.telemetry.mozilla.org"});

metrics.pageLoaded.set();

const submitPingButton = document.getElementById("glean");
submitPingButton.addEventListener("click", () => {
  submission.submit();

  const consoleWarn = document.getElementById("console-warn");
  consoleWarn.classList.add("visible");
});

const recordButton = document.getElementById("record");
recordButton.addEventListener("click", () => {
  metrics.buttonClicked.add();
  console.info("Adding to the `buttonClicked` metric.");
});

