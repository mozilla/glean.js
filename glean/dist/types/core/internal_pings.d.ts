import { InternalPingType as PingType } from "./pings/ping_type.js";
/**
 * Glean-provided pings, all enabled by default.
 *
 * Pings initialized here should be defined in `./pings.yaml`
 * and manually translated into JS code.
 */
declare class CorePings {
    readonly deletionRequest: PingType;
    readonly events: PingType;
    constructor();
}
export default CorePings;
