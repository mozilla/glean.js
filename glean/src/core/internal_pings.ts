/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { DELETION_REQUEST_PING_NAME } from "./constants";
import PingType from "./pings";

/**
 * Glean-provided pings, all enabled by default.
 *
 * Pings initialized here should be defined in `./pings.yaml`
 * and manually translated into JS code.
 */
class CorePings {
  // This ping is intended to communicate to the Data Pipeline
  // that the user wishes to have their reported Telemetry data deleted.
  // As such it attempts to send itself at the moment the user opts out of data collection.
  readonly deletionRequest: PingType;

  constructor() {
    this.deletionRequest = new PingType({
      name: DELETION_REQUEST_PING_NAME,
      includeClientId: true,
      sendIfEmpty: true,
    });
  }
}

export default CorePings;
