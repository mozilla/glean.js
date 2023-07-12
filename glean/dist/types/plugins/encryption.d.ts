import type { JWK } from "jose";
import Plugin from "./index.js";
import type { PingPayload } from "../core/pings/ping_payload.js";
import type { JSONObject } from "../core/utils.js";
import CoreEvents from "../core/events/async.js";
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
declare class PingEncryptionPlugin extends Plugin<(typeof CoreEvents)["afterPingCollection"]> {
    private jwk;
    /**
     * Creates a new PingEncryptionPlugin instance.
     *
     * @param jwk The JWK that will be used to encode outgoing ping payloads.
     */
    constructor(jwk: JWK);
    action(payload: PingPayload): Promise<JSONObject>;
}
export default PingEncryptionPlugin;
