/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { useEffect } from "react";

import Glean from "@mozilla/glean/web";
import * as metrics from "./generated/appEvents";

const APP_NAME = "glean-react-sample";

const useGlean = () => {
  useEffect(() => {
    Glean.setLogPings(true);
    Glean.setDebugViewTag(APP_NAME);

    Glean.initialize(APP_NAME, true, {
      maxEvents: 1
    });
  }, []);

  return metrics;
};

export default useGlean;
