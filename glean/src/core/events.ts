/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { PingPayload } from "./pings/database";
import { JSONObject } from "./utils";

import { GleanEvent } from "../plugins/index";

export const AfterPingCollection: GleanEvent<[PingPayload], Promise<JSONObject>> = {
  name: "afterPingCollection"
};

type GleanEvents = typeof AfterPingCollection;
export default GleanEvents;
