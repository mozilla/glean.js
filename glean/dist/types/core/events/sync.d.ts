import type { PingPayload } from "../pings/ping_payload";
import type { JSONObject } from "../utils.js";
import { CoreEvent } from "./shared.js";
/**
 * Glean internal events.
 */
declare const CoreEventsSync: {
    afterPingCollection: CoreEvent<[PingPayload], JSONObject>;
    [unused: string]: CoreEvent;
};
export default CoreEventsSync;
