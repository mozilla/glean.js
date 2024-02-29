/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "@mozilla/glean/web";
import { benchmark } from "./generated/pings.js";
import * as metrics from "./generated/sample.js";

Glean.setSourceTags(["automation"]);
Glean.initialize("glean-compat-benchmark", true, {
  enableAutoPageLoadEvents: true,
  // Setting the override to 0 means every action will trigger
  // a new session. We use this to check that the session ID
  // changes whenever a session has expired.
  sessionLengthInMinutesOverride: 0
});

metrics.pageLoaded.set();
benchmark.submit();

// !BIG HACK!
//
// Overwrite the console.info function in order to know when (and if) the benchmark ping was sent.
// If a success ping message is logged we show that in the document.
//
// We cannot use the ping testing APIs since these "tests" are actually checks
// running on a live application. For us to utilize the ping testing APIs, 
// like `<ping>.testBeforeNextSubmit` we would need Glean to be running in testing mode.
let pingSubmissionCount = 0;
let sessionId = "";
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
      var elem = document.getElementById("ping_msg");
      elem.innerText = "Pings submitted successfully.";
    }
  }

  // Pull all user lifetime metrics from Glean.
  const userLifetimeMetrics = window.localStorage.getItem("userLifetimeMetrics");

  // Extract the session id metric.
  const sessionInfo = /"session_id":".{36}"/.exec(userLifetimeMetrics);
  if (!!sessionInfo.length) {
    const currSessionId = sessionInfo[0]?.split(":")?.[1]?.split("\"")?.[1];
    if (!!sessionId) {
      if (currSessionId !== sessionId) {
        var elem = document.getElementById("session_msg");
        elem.innerText = "Session IDs updated successfully.";
      } else {
        console.log("Something went wrong...");
      }
    }

    sessionId = currSessionId;
  }
}
