import { v4 as UUIDv4 } from "uuid";
import { Context } from "./context.js";
import { ErrorType } from "./error/error_type.js";
import log, { LoggingLevel } from "./log.js";
import { MetricValidationError } from "./metrics/metric.js";
const LOG_TAG = "core.utils";
export function isJSONValue(v) {
    if (isString(v) || isBoolean(v) || isNumber(v)) {
        return true;
    }
    if (isObject(v)) {
        if (Object.keys(v).length === 0) {
            return true;
        }
        for (const key in v) {
            return isJSONValue(v[key]);
        }
    }
    if (Array.isArray(v)) {
        return v.every((e) => isJSONValue(e));
    }
    return false;
}
export function isObject(v) {
    return (typeof v === "object" && v !== null && v.constructor === Object);
}
export function isEmptyObject(v) {
    return Object.keys(v || {}).length === 0;
}
export function isUndefined(v) {
    return typeof v === "undefined";
}
export function isString(v) {
    return typeof v === "string";
}
export function isBoolean(v) {
    return typeof v === "boolean";
}
export function isNumber(v) {
    return typeof v === "number" && !isNaN(v);
}
export function isInteger(v) {
    return isNumber(v) && Number.isInteger(v);
}
export function sanitizeApplicationId(applicationId) {
    return applicationId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}
export function validateURL(v) {
    const urlPattern = /^(http|https):\/\/[a-zA-Z0-9._-]+(:\d+){0,1}(\/{0,1})$/i;
    return urlPattern.test(v);
}
export function validateHeader(v) {
    return /^[a-z0-9-]{1,20}$/i.test(v);
}
export function generateUUIDv4() {
    if (typeof crypto !== "undefined") {
        return UUIDv4();
    }
    else {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
export function getMonotonicNow() {
    const now = typeof performance === "undefined"
        ? Date.now()
        : performance.now();
    return Math.round(now);
}
export async function truncateStringAtBoundaryWithError(metric, value, length) {
    if (!isString(value)) {
        throw new MetricValidationError(`Expected string, got ${JSON.stringify(value)}`);
    }
    const truncated = value.substring(0, length);
    if (truncated !== value) {
        await Context.errorManager.record(metric, ErrorType.InvalidOverflow, `Value length ${value.length} exceeds maximum of ${length}.`);
    }
    return truncated;
}
export function truncateStringAtBoundaryWithErrorSync(metric, value, length) {
    if (!isString(value)) {
        throw new MetricValidationError(`Expected string, got ${JSON.stringify(value)}`);
    }
    const truncated = value.substring(0, length);
    if (truncated !== value) {
        Context.errorManager.record(metric, ErrorType.InvalidOverflow, `Value length ${value.length} exceeds maximum of ${length}.`);
    }
    return truncated;
}
export function testOnlyCheck(name, logTag = LOG_TAG) {
    if (!Context.testing) {
        log(logTag, [
            `Attempted to access test only method \`${name || "unknown"}\`,`,
            "but Glean is not in testing mode. Ignoring. Make sure to put Glean in testing mode",
            "before accessing such methods, by calling `testResetGlean`."
        ], LoggingLevel.Error);
        return false;
    }
    return true;
}
export function saturatingAdd(...args) {
    let result = args.reduce((sum, item) => sum + item, 0);
    if (result > Number.MAX_SAFE_INTEGER) {
        result = Number.MAX_SAFE_INTEGER;
    }
    return result;
}
export function getCurrentTimeInNanoSeconds() {
    let now;
    if (typeof process === "undefined") {
        now = getMonotonicNow();
    }
    else {
        const hrTime = process.hrtime();
        now = hrTime[0] * 1000000000 + hrTime[1];
    }
    return now;
}
export function isWindowObjectUnavailable() {
    return typeof window === "undefined";
}
