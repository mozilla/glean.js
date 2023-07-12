import type { PingPayload } from "../pings/ping_payload";
import type { JSONObject } from "../utils.js";
import { CoreEvent } from "./shared.js";
/**
 * Glean internal events.
 */
declare const CoreEvents: {
    afterPingCollection: CoreEvent<[PingPayload], Promise<JSONObject>>;
    [unused: string]: CoreEvent;
};
export default CoreEvents;
