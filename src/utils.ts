/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export function isObject(v: unknown): v is Record<string | number | symbol, unknown> {
  return (v && typeof v === "object" && v.constructor === Object);
}

export function isUndefined(v: unknown): v is undefined {
  return typeof v === "undefined";
}

export function isString(v: unknown): v is string {
  return (v && (typeof v === "string" || (v === "object" && v.constructor === String)));
}
