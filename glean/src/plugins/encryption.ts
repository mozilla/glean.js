/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import CompactEncrypt from "jose/jwe/compact/encrypt";
import parseJwk from "jose/jwk/parse";
import { JWK } from "jose/types";

import Plugin from "./index";
import { PingPayload } from "../core/pings/database";
import { JSONObject } from "../core/utils";
import CoreEvents from "../core/events";

/**
 * A plugin that encrypts the payload of pings before they are stored and sent.
 */
class PingEncryptionPlugin extends Plugin<typeof CoreEvents["afterPingCollection"]> {
  constructor(readonly jwk: JWK) {
    super(CoreEvents["afterPingCollection"].name, "pingEncryptionPlugin");
  }

  async action(payload: PingPayload): Promise<JSONObject> {
    const key = await parseJwk(this.jwk);
    const encoder = new TextEncoder();
    const encodedPayload = await new CompactEncrypt(encoder.encode(JSON.stringify(payload)))
      .setProtectedHeader({
        kid: this.jwk.kid,
        alg: this.jwk.alg,
        enc: "A256GCM",
        typ: "JWE",
      })
      .encrypt(key);
    return { payload: encodedPayload };
  }
}

export default PingEncryptionPlugin;
