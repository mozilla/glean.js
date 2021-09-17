/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "@mozilla/glean/node";
import { custom } from "./generated/pings.js";
import { appStarted } from "./generated/sample.js";

export default () => {
  const { GLEAN_DEBUG_VIEW_TAG } = process.env;
  if (GLEAN_DEBUG_VIEW_TAG) {
    Glean.setDebugViewTag(GLEAN_DEBUG_VIEW_TAG);
  }

  Glean.setLogPings(true);
  Glean.initialize("gleanjs-node-sample", true);

  appStarted.set();
  custom.submit();
}
