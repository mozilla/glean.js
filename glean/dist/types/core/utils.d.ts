import type { MetricType } from "./metrics/index.js";
export declare type JSONPrimitive = string | number | boolean;
export declare type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export declare type JSONObject = {
    [member: string]: JSONValue | undefined;
};
export declare type JSONArray = JSONValue[];
/**
 * Verifies if a given value is a valid JSONValue.
 *
 * @param v The value to verify
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a valid JSONValue.
 */
export declare function isJSONValue(v: unknown): v is JSONValue;
/**
 * Checks whether or not `v` is a simple data object.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a valid data object.
 */
export declare function isObject(v: unknown): v is Record<string | number | symbol, unknown>;
/**
 * Checks whether or not `v` is an empty object.
 *
 * @param v The value to verify.
 * @returns A boolean value stating whether `v` is an empty object.
 */
export declare function isEmptyObject(v: unknown): boolean;
/**
 * Checks whether or not `v` is undefined.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is undefined.
 */
export declare function isUndefined(v: unknown): v is undefined;
/**
 * Checks whether or not `v` is a string.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a string.
 */
export declare function isString(v: unknown): v is string;
/**
 * Checks whether or not `v` is a boolean.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a boolean.
 */
export declare function isBoolean(v: unknown): v is boolean;
/**
 * Checks whether or not `v` is a number.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a number.
 */
export declare function isNumber(v: unknown): v is number;
/**
 * Checks whether or not `v` is an integer.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a number.
 */
export declare function isInteger(v: unknown): v is number;
/**
 * Generates a pipeline-friendly string
 * that replaces non alphanumeric characters with dashes.
 *
 * @param applicationId The application if to sanitize.
 * @returns The sanitized application id.
 */
export declare function sanitizeApplicationId(applicationId: string): string;
/**
 * Check that a given string is a valid URL.
 *
 * @param v The string to validate.
 * @returns Whether or not the given string is a valid url.
 */
export declare function validateURL(v: string): boolean;
/**
 * Validates whether or not a given value is an acceptable HTTP header for outgoing pings.
 *
 * @param v The value to validate.
 * @returns Whether or not the given value is a valid HTTP header value.
 */
export declare function validateHeader(v: string): boolean;
/**
 * Generates a UUIDv4.
 *
 * Will provide a fallback in case `crypto` is not available,
 * which makes the "uuid" package generator not work.
 *
 * # Important
 *
 * This workaround is here for usage in Qt/QML environments, where `crypto` is not available.
 * Bug 1688015 was opened to figure out a less hacky way to do this.
 *
 * @returns A randomly generated UUIDv4.
 */
export declare function generateUUIDv4(): string;
/**
 * A helper function to get the current amount of milliseconds passed since
 * a given time origin.
 *
 * @returns The number of milliseconds since the time origin.
 */
export declare function getMonotonicNow(): number;
/**
 * Truncates a string to a given max length.
 *
 * If the string required truncation, records an error through the error
 * reporting mechanism.
 *
 * @param metric The metric to record an error to, if necessary,
 * @param value The string to truncate.
 * @param length The length to truncate to.
 * @returns A string with at most `length` bytes.
 * @throws In case `value` is not a string.
 */
export declare function truncateStringAtBoundaryWithError(metric: MetricType, value: unknown, length: number): Promise<string>;
/**
 * Truncates a string to a given max length SYNCHRONOUSLY.
 *
 * If the string required truncation, records an error through the error
 * reporting mechanism.
 *
 * @param metric The metric to record an error to, if necessary,
 * @param value The string to truncate.
 * @param length The length to truncate to.
 * @returns A string with at most `length` bytes.
 * @throws In case `value` is not a string.
 */
export declare function truncateStringAtBoundaryWithErrorSync(metric: MetricType, value: unknown, length: number): string;
/**
 * Decorator factory that will only allow a function to be called when Glean is in testing mode.
 *
 * @param name The name of the function that is being called. Used for logging purposes only.
 * @param logTag The log tag of the current module.
 * @returns Whether or not Glean is in testing mode.
 */
export declare function testOnlyCheck(name: string, logTag?: string): boolean;
/**
 * Computes a sum, saturating at Number.MAX_SAFE_INTEGER.
 *
 * @param {...number} args Arguments to sum
 * @returns Sum result, of Number.MAX_SAFE_INTEGER is sum was larger than that.
 */
export declare function saturatingAdd(...args: number[]): number;
/**
 * Generate timestamp for current time in nanoseconds. If process
 * is not defined, we fallback to `getMonotonicNow()`.
 *
 * @returns Timestamp of current time in nanoseconds.
 */
export declare function getCurrentTimeInNanoSeconds(): number;
/**
 * Checks if the current environment has access to the `window` object. This
 * check is used to conditional-ize browser code for SSR projects. If the
 * platform does not have access to the `window` APIs, then we are unable to
 * store data in the browser.
 *
 * @returns Whether or not the current platform has access to the `window` object.
 */
export declare function isWindowObjectUnavailable(): boolean;
