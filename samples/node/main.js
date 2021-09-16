/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "@mozilla/glean/node";
import { custom } from "./generated/pings.js";
import { appStarted } from "./generated/sample.js";

export default () => {
  Glean.setLogPings(true);
  // Uncomment when you need to inspect the pings sent in the Glean Debug Ping Viewer.
  // Glean.setDebugViewTag("gleanjs-node-sample");
  Glean.initialize("gleanjs-node-sample", true);

  appStarted.set();
  custom.submit();
}
