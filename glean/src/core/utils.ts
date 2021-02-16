/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { v4 as UUIDv4 } from "uuid";

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

  if (Array.isArray(v)) {
    return v.every((e) => isJSONValue(e));
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
  return applicationId.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
}

/**
 * Check that a given string is a valid URL.
 *
 * @param v The string to validate.
 *
 * @returns Whether or not the given string is a valid url.
 */
export function validateURL(v: string): boolean {
  const urlPattern = /^(http|https):\/\/[a-zA-Z0-9._-]+(:\d+){0,1}(\/{0,1})$/i;
  return urlPattern.test(v);
}

/**
 * Generates a UUIDv4.
 *
 * Will provide a fallback in case `crypto` is not available,
 * which makes the "uuid" package generator not work.
 *
 * # Important
 *
 * This workaround is here for usage in Qt/QML platformironments, where `crypto` is not available.
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
