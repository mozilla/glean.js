/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Metric, MetricType, CommonMetricData } from "metrics";
import { isBoolean } from "utils";
import Glean from "glean";

export class BooleanMetric extends Metric<boolean, boolean> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is boolean {
    return isBoolean(v);
  }

  payload(): boolean {
    return this._inner;
  }
}

/**
 *  A boolean metric.
 *
 * Records a simple flag.
 */
class BooleanMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("boolean", meta);
  }

  /**
   * Sets to the specified boolean value.
   *
   * @param value the value to set.
   */
  set(value: boolean): void {
    if (!this.shouldRecord()) {
      return;
    }

    const metric = new BooleanMetric(value);
    this.dispatchRecordingTask(() => Glean.metricsDatabase.record(this, metric));
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
  async testGetValue(ping: string): Promise<boolean | undefined> {
    await this.testBlockOnRecordingTasks();
    return Glean.metricsDatabase.getMetric<boolean>(ping, this);
  }
}

export default BooleanMetricType;
