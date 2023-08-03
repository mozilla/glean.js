/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { MetricType } from "./metrics/index.js";
import { v4 as UUIDv4 } from "uuid";
import { Context } from "./context.js";
import { ErrorType } from "./error/error_type.js";
import log, { LoggingLevel } from "./log.js";
import { MetricValidationError } from "./metrics/metric.js";
import type ErrorManagerSync from "./error/sync.js";

const LOG_TAG = "core.utils";

// We will intentionally leave `null` out even though it is a valid JSON primitive.
export type JSONPrimitive = string | number | boolean;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue | undefined };
export type JSONArray = JSONValue[];

/**
 * Verifies if a given value is a valid JSONValue.
 *
 * @param v The value to verify
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a valid JSONValue.
 */
export function isJSONValue(v: unknown): v is JSONValue {
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

/**
 * Checks whether or not `v` is a simple data object.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a valid data object.
 */
export function isObject(v: unknown): v is Record<string | number | symbol, unknown> {
  return (typeof v === "object" && v !== null && v.constructor === Object);
}

/**
 * Checks whether or not `v` is an empty object.
 *
 * @param v The value to verify.
 * @returns A boolean value stating whether `v` is an empty object.
 */
export function isEmptyObject(v: unknown): boolean {
  return Object.keys(v || {}).length === 0;
}

/**
 * Checks whether or not `v` is undefined.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is undefined.
 */
export function isUndefined(v: unknown): v is undefined {
  return typeof v === "undefined";
}

/**
 * Checks whether or not `v` is a string.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a string.
 */
export function isString(v: unknown): v is string {
  return typeof v === "string";
}

/**
 * Checks whether or not `v` is a boolean.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a boolean.
 */
export function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

/**
 * Checks whether or not `v` is a number.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a number.
 */
export function isNumber(v: unknown): v is number {
  return typeof v === "number" && !isNaN(v);
}

/**
 * Checks whether or not `v` is an integer.
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a number.
 */
export function isInteger(v: unknown): v is number {
  return isNumber(v) && Number.isInteger(v);
}

/**
 * Generates a pipeline-friendly string
 * that replaces non alphanumeric characters with dashes.
 *
 * @param applicationId The application if to sanitize.
 * @returns The sanitized application id.
 */
export function sanitizeApplicationId(applicationId: string): string {
  return applicationId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

/**
 * Check that a given string is a valid URL.
 *
 * @param v The string to validate.
 * @returns Whether or not the given string is a valid url.
 */
export function validateURL(v: string): boolean {
  const urlPattern = /^(http|https):\/\/[a-zA-Z0-9._-]+(:\d+){0,1}(\/{0,1})$/i;
  return urlPattern.test(v);
}

/**
 * Validates whether or not a given value is an acceptable HTTP header for outgoing pings.
 *
 * @param v The value to validate.
 * @returns Whether or not the given value is a valid HTTP header value.
 */
export function validateHeader(v: string): boolean {
  return /^[a-z0-9-]{1,20}$/i.test(v);
}

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
export function generateUUIDv4(): string {
  if (typeof crypto !== "undefined") {
    return UUIDv4();
  } else {
    // Copied from https://stackoverflow.com/a/2117523/261698
    // and https://stackoverflow.com/questions/105034/how-to-create-guid-uuid
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * A helper function to get the current amount of milliseconds passed since
 * a given time origin.
 *
 * @returns The number of milliseconds since the time origin.
 */
export function getMonotonicNow(): number {
  // Sadly, `performance.now` is not available on Qt, which
  // means we should get creative to find a proper clock for that platform.
  // Fall back to `Date.now` for now, until bug 1690528 is fixed.
  const now = typeof performance === "undefined"
    ? Date.now()
    : performance.now();

  return Math.round(now);
}

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
export async function truncateStringAtBoundaryWithError(metric: MetricType, value: unknown, length: number): Promise<string> {
  if(!isString(value)) {
    throw new MetricValidationError(`Expected string, got ${JSON.stringify(value)}`);
  }

  const truncated = value.substring(0, length);
  if (truncated !== value) {
    await Context.errorManager.record(
      metric,
      ErrorType.InvalidOverflow,
      `Value length ${value.length} exceeds maximum of ${length}.`
    );
  }
  return truncated;
}

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
export function truncateStringAtBoundaryWithErrorSync(metric: MetricType, value: unknown, length: number): string {
  if(!isString(value)) {
    throw new MetricValidationError(`Expected string, got ${JSON.stringify(value)}`);
  }

  const truncated = value.substring(0, length);
  if (truncated !== value) {
    (Context.errorManager as ErrorManagerSync).record(
      metric,
      ErrorType.InvalidOverflow,
      `Value length ${value.length} exceeds maximum of ${length}.`
    );
  }
  return truncated;
}

/**
 * Decorator factory that will only allow a function to be called when Glean is in testing mode.
 *
 * @param name The name of the function that is being called. Used for logging purposes only.
 * @param logTag The log tag of the current module.
 * @returns Whether or not Glean is in testing mode.
 */
export function testOnlyCheck(name: string, logTag = LOG_TAG): boolean {
  if (!Context.testing) {
    log(
      logTag,
      [
        `Attempted to access test only method \`${name || "unknown"}\`,`,
        "but Glean is not in testing mode. Ignoring. Make sure to put Glean in testing mode",
        "before accessing such methods, by calling `testResetGlean`."
      ],
      LoggingLevel.Error
    );

    return false;
  }

  return true;
}

/**
 * Computes a sum, saturating at Number.MAX_SAFE_INTEGER.
 *
 * @param {...number} args Arguments to sum
 * @returns Sum result, of Number.MAX_SAFE_INTEGER is sum was larger than that.
 */
export function saturatingAdd(...args: number[]) {
  let result = args.reduce((sum, item) => sum + item, 0);
  if (result > Number.MAX_SAFE_INTEGER) {
    result = Number.MAX_SAFE_INTEGER;
  }

  return result;
}

/**
 * Generate timestamp for current time in nanoseconds. If process
 * is not defined, we fallback to `getMonotonicNow()`.
 *
 * @returns Timestamp of current time in nanoseconds.
 */
export function getCurrentTimeInNanoSeconds(): number {
  let now;
  if (typeof process === "undefined") {
    now = getMonotonicNow();
  } else {
    // in Node, this is the most accurate way to get nanoseconds, so we will use
    // this when possible
    const hrTime = process.hrtime();
    now = hrTime[0] * 1000000000 + hrTime[1];
  }
  return now;
}

/**
 * Checks if the current environment has access to the `window` object. This
 * check is used to conditional-ize browser code for SSR projects. If the
 * platform does not have access to the `window` APIs, then we are unable to
 * store data in the browser.
 *
 * @returns Whether or not the current platform has access to the `window` object.
 */
export function isWindowObjectUnavailable(): boolean {
  return typeof window === "undefined";
}
