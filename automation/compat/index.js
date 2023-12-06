/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "@mozilla/glean/web";
import { benchmark } from "./generated/pings.js";
import * as metrics from "./generated/sample.js";

Glean.setSourceTags(["automation"]);
Glean.initialize("glean-compat-benchmark", true, {
  enableAutoPageLoadEvents: true
});

metrics.pageLoaded.set();
benchmark.submit();

// !BIG HACK!
//
// Overwrite the console.info function in order to know when (and if) the benchmark ping was sent.
// If a success ping message is logged we show that in the document.
let pingSubmissionCount = 0;
console.info = function () {
  var message = "";
  for (var i = 0; i < arguments.length; i++) {
    message += arguments[i];

    if (i < arguments.length - 1) {
      message += " ";
    }
  }
  console.log(message);
  if (/successfully sent 200.$/.test(message)) {
    pingSubmissionCount++;

    // Two pings should be submitted when run successfully
    // 1. The built-in page_load event, which submits an events ping.
    // 2. The benchmark ping.
    if (pingSubmissionCount == 2) {
      var elem = document.getElementById("msg");
      elem.innerHTML = "Pings submitted successfully.";
    }
  }
}
