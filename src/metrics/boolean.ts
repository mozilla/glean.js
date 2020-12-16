/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Metric, { CommonMetricData } from "metrics";
import Glean from "glean";
import { isBoolean } from "utils";

export type BooleanMetricPayload = boolean;

/**
 * Checks whether or not `v` is a valid boolean metric payload.
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a valid boolean metric payload.
 */
export function isBooleanMetricPayload(v: unknown): v is BooleanMetricPayload {
  return isBoolean(v);
}

class BooleanMetric extends Metric {
  constructor(meta: CommonMetricData) {
    super("boolean", meta);
  }

  /**
   * Sets to the specified boolean value.
   *
   * @param value the value to set.
   */
  async set(value: BooleanMetricPayload): Promise<void> {
    if (!this.shouldRecord()) {
      return;
    }

    await Glean.db.record(this, value);
  }

  /**
   * **Test-only API**
   *
   * Gets the currently stored value as a boolean.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string): Promise<BooleanMetricPayload | undefined> {
    return Glean.db.getMetric(ping, this);
  }
}

export default BooleanMetric;
