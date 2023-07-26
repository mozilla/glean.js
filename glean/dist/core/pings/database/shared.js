import { strToU8 } from "fflate";
import { DELETION_REQUEST_PING_NAME } from "../../constants.js";
import { isJSONValue, isNumber, isObject, isString } from "../../utils.js";
export const PINGS_DATABASE_LOG_TAG = "core.Pings.Database";
export function isDeletionRequest(ping) {
    return ping.path.split("/")[3] === DELETION_REQUEST_PING_NAME;
}
export function getPingSize(ping) {
    return strToU8(JSON.stringify(ping)).length;
}
export function isValidPingInternalRepresentation(v) {
    if (isObject(v)) {
        const hasValidCollectionDate = "collectionDate" in v &&
            isString(v.collectionDate) &&
            isNumber(new Date(v.collectionDate).getTime());
        const hasValidPath = "path" in v && isString(v.path);
        const hasValidPayload = "payload" in v && isJSONValue(v.payload) && isObject(v.payload);
        const hasValidHeaders = !("headers" in v) || (isJSONValue(v.headers) && isObject(v.headers));
        if (!hasValidCollectionDate || !hasValidPath || !hasValidPayload || !hasValidHeaders) {
            return false;
        }
        return true;
    }
    return false;
}
export function sortPings(pings) {
    return Object.entries(pings).sort(([_idA, { collectionDate: dateA }], [_idB, { collectionDate: dateB }]) => {
        const timeA = new Date(dateA).getTime();
        const timeB = new Date(dateB).getTime();
        return timeA - timeB;
    });
}
