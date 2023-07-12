import { Context } from "../../context.js";
import { GLEAN_SCHEMA_VERSION } from "../../constants.js";
export const PINGS_MAKER_LOG_TAG = "core.Pings.Maker";
export function makePath(identifier, ping) {
    return `/submit/${Context.applicationId}/${ping.name}/${GLEAN_SCHEMA_VERSION}/${identifier}`;
}
export function getPingHeaders() {
    const headers = {};
    if (Context.config.debugViewTag) {
        headers["X-Debug-ID"] = Context.config.debugViewTag;
    }
    if (Context.config.sourceTags) {
        headers["X-Source-Tags"] = Context.config.sourceTags.toString();
    }
    if (Object.keys(headers).length > 0) {
        return headers;
    }
}
