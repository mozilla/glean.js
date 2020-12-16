/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Checks whether or not `v` is a simple data object.
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a valid data object.
 */
export function isObject(v: unknown): v is Record<string | number | symbol, unknown> {
  return (typeof v === "object" && v !== null  && v.constructor === Object);
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
  return (typeof v === "string" || (typeof v === "object" && v !== null  && v.constructor === String));
}

/**
 * Checks whether or not `v` is a boolean.
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a boolean.
 */
export function isBoolean(v: unknown): v is string {
  return (typeof v === "boolean" || (typeof v === "object" && v !== null && v.constructor === Boolean));
}
