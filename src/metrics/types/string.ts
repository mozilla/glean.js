/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Metric, MetricType, CommonMetricData } from "metrics";
import { isString } from "utils";
import Glean from "glean";

export const MAX_LENGTH_VALUE = 100;

export class StringMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is string {
    if (!isString(v)) {
      return false;
    }

    if (v.length > MAX_LENGTH_VALUE) {
      return false;
    }

    return true;
  }

  payload(): string {
    return this._inner;
  }
}

/**
 * A string metric.
 *
 * Record an Unicode string value with arbitrary content.
 * Strings are length-limited to `MAX_LENGTH_VALUE` bytes.
 */
class StringMetricType extends MetricType {
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
  set(value: string): void {
    if (!this.shouldRecord()) {
      return;
    }

    if (value.length > MAX_LENGTH_VALUE) {
      // TODO: record error once Bug 1682574 is resolved.
      console.warn(`String ${value} is longer than ${MAX_LENGTH_VALUE} chars. Truncating.`);
    }

    const metric = new StringMetric(value.substr(0, MAX_LENGTH_VALUE));
    this.dispatchRecordingTask(() => Glean.metricsDatabase.record(this, metric));
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
  async testGetValue(ping: string): Promise<string | undefined> {
    await this.testBlockOnRecordingTasks();
    return Glean.metricsDatabase.getMetric<string>(ping, this);
  }
}

export default StringMetricType;
