/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// We will intentionaly leave `null` out even though it is a valid JSON primitive.
export type JSONPrimitive = string | number | boolean;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue | undefined };
export type JSONArray = JSONValue[];

/**
 * Verifies if a given value is a valid JSONValue.
 *
 * @param v The value to verify
 *
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

  return false;
}

/**
 * Checks whether or not `v` is a simple data object.
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a valid data object.
 */
export function isObject(v: unknown): v is Record<string | number | symbol, unknown> {
  return (typeof v === "object" && v !== null && v.constructor === Object);
}

/**
 * Checks whether or not `v` is undefined.
 *
 * @param v The value to verify.
 *
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
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a string.
 */
export function isString(v: unknown): v is string {
  return (typeof v === "string" || (typeof v === "object" && v !== null && v.constructor === String));
}

/**
 * Checks whether or not `v` is a boolean.
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a boolean.
 */
export function isBoolean(v: unknown): v is boolean {
  return (typeof v === "boolean" || (typeof v === "object" && v !== null && v.constructor === Boolean));
}

/**
 * Checks whether or not `v` is a number.
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a number.
 */
export function isNumber(v: unknown): v is number {
  return ((typeof v === "number" || (typeof v === "object" && v !== null && v.constructor === Number)) && !isNaN(v));
}

/**
 * Generates a pipeline-friendly string
 * that replaces non alphanumeric characters with dashes.
 *
 * @param applicationId The application if to sanitize.
 *
 * @returns The sanitized applicaiton id.
 */
export function sanitizeApplicationId(applicationId: string): string {
  let result = "";
  const tester = /([a-z0-9])/i;
  for (let i = 0; i < applicationId.length; i++) {
    if (tester.test(applicationId[i])) {
      result += applicationId[i].toLowerCase();
    } else {
      if (result[result.length - 1] !== "-") {
        result += "-";
      }
    }
  }
  return result;
}
