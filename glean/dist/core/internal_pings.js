import { DELETION_REQUEST_PING_NAME, EVENTS_PING_NAME } from "./constants.js";
import { InternalPingType as PingType } from "./pings/ping_type.js";
class CorePings {
    constructor() {
        this.deletionRequest = new PingType({
            name: DELETION_REQUEST_PING_NAME,
            includeClientId: true,
            sendIfEmpty: true,
            reasonCodes: ["at_init", "set_upload_enabled"],
        });
        this.events = new PingType({
            name: EVENTS_PING_NAME,
            includeClientId: true,
            sendIfEmpty: false,
            reasonCodes: ["startup", "max_capacity"]
        });
    }
}
export default CorePings;
