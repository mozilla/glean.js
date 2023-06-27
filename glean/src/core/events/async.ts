/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { PingPayload } from "../pings/ping_payload";
import type { JSONObject } from "../utils.js";
import { CoreEvent } from "./shared.js";

/**
 * Glean internal events.
 */
const CoreEvents: {
  afterPingCollection: CoreEvent<[PingPayload], Promise<JSONObject>>;
  [unused: string]: CoreEvent;
} = {
  // Event that is triggered immediately after a ping is collect and before it is recorded.
  //
  //  - Context: The `PingPayload` of the recently collected ping.
  //  - Result: The modified payload as a JSON object.
  afterPingCollection: new CoreEvent<[PingPayload], Promise<JSONObject>>("afterPingCollection")
};

export default CoreEvents;
