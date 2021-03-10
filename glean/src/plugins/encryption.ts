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
 * A plugin that listens for the `afterPingCollection` event and encrypts **all** outgoing pings
 * with the JWK provided upon initialization.
 *
 * This plugin will modify the schema of outgoing pings to:
 *
 * ```json
 * {
 *  payload: "<encrypted-payload>"
 * }
 * ```
 */
class PingEncryptionPlugin extends Plugin<typeof CoreEvents["afterPingCollection"]> {
  /**
   * Creates a new PingEncryptionPlugin instance.
   *
   * @param jwk The JWK that will be used to encode outgoing ping payloads.
   * @param alg The algorithm this plugin will use for parsing the JWK. If this argument is not present,
   *            we will look for the `alg` key in the JWK. If neither is present we default to "ECDH-ES".
   */
  constructor(private jwk: JWK, private alg?: string) {
    super(CoreEvents["afterPingCollection"].name, "pingEncryptionPlugin");

    if (!alg) {
      this.alg = jwk.alg ? jwk.alg : "ECDH-ES";
    }
  }

  async action(payload: PingPayload): Promise<JSONObject> {
    const key = await parseJwk(this.jwk, this.alg);
    const encoder = new TextEncoder();
    const encodedPayload = await new CompactEncrypt(encoder.encode(JSON.stringify(payload)))
      .setProtectedHeader({
        kid: this.jwk.kid,
        alg: this.alg,
        enc: "A256GCM",
        typ: "JWE",
      })
      .encrypt(key);
    return { payload: encodedPayload };
  }
}

export default PingEncryptionPlugin;
