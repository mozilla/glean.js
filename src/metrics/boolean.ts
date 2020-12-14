/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Metric, { CommonMetricData } from "metrics";
import Glean from "glean";
import { isBoolean } from "utils";

export type BooleanMetricPayload = boolean;
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
   * @param glean the Glean instance this metric belongs to.
   * @param value the value to set.
   */
  async set(glean: Glean, value: BooleanMetricPayload): Promise<void> {
    if (!this.shouldRecord(glean)) {
      return;
    }

    glean.db.record(this, value);
  }

  /**
   * **Test-only API (exported for FFI purposes).**
   *
   * Gets the currently stored value as a boolean.
   *
   * This doesn't clear the stored value.
   *
   * @param glean the Glean instance this metric belongs to.
   * @param ping the ping from which we want to retrieve this metrics value from.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(glean: Glean, ping: string): Promise<BooleanMetricPayload | undefined> {
    return glean.db.getMetric(ping, isBooleanMetricPayload, this);
  }
}

export default BooleanMetric;
