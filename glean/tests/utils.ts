/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gunzipSync } from "fflate";

import type { JSONObject } from "../src/core/utils";
import { isString } from "../src/core/utils";

/**
 * Decoded, unzips and parses the ping payload into a JSON object.
 *
 * @param payload The payload to process.
 * @returns The processed payload.
 */
export function unzipPingPayload(payload: Uint8Array | string): JSONObject {
  let parsedBody: JSONObject;
  if (!isString(payload)) {
    const decoder = new TextDecoder("utf8");
    parsedBody = JSON.parse(decoder.decode(gunzipSync(payload))) as JSONObject;
  } else {
    parsedBody = JSON.parse(payload) as JSONObject;
  }
  return parsedBody;
}
