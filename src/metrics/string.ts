/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Metric, { CommonMetricData } from "metrics";
import Glean from "glean";
import { isString } from "utils";

export const MAX_LENGTH_VALUE = 100;

export type StringMetricPayload = string;

/**
 * Checks whether or not `v` is a valid string metric payload.
 *
 * # Note
 *
 * Not only will this verify if `v` is a string,
 * it will also check if its length is less than `MAX_LENGTH_VALUE`.
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating wether `v` is a valid string metric payload.
 */
export function isStringMetricPayload(v: unknown): v is StringMetricPayload {
  if (!isString(v)) {
    return false;
  }

  if (v.length > MAX_LENGTH_VALUE) {
    return false;
  }

  return true;
}

/**
 * A string metric.
 *
 * Record an Unicode string value with arbitrary content.
 * Strings are length-limited to `MAX_LENGTH_VALUE` bytes.
 */
class StringMetric extends Metric {
  constructor(meta: CommonMetricData) {
    super("string", meta);
  }

  /**
   * Sets to the specified string value.
   *
   * # Note
   *
   * Truncates the value if it is longer than `MAX_STRING_LENGTH` bytes
   * and logs an error.
   *
   * @param value the value to set.
   */
  async set(value: string): Promise<void> {
    if (!this.shouldRecord()) {
      return;
    }

    if (value.length > MAX_LENGTH_VALUE) {
      // TODO: record error once Bug 1682574 is resolved.
      console.warn(`String ${value} is longer than ${MAX_LENGTH_VALUE} chars. Truncating.`);
    }

    await Glean.db.record(this, value.substring(0, MAX_LENGTH_VALUE));
  }

  /**
   * **Test-only API**
   *
   * Gets the currently stored value as a string.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string): Promise<StringMetricPayload | undefined> {
    return Glean.db.getMetric(ping, this);
  }
}

export default StringMetric;
