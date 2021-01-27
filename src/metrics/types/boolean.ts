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
abstract class BooleanMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("boolean", meta);
  }

  /**
   * Sets the boolean metric type to a given value.
   *
   * @param value the value to set.
   * @param recordFn a function that will record this metric.
   */
  protected setInternal(value: boolean, recordFn: (metric: BooleanMetric) => void): void {
    if (!this.shouldRecord()) {
      return;
    }

    const metric = new BooleanMetric(value);
    if (metric) {
      recordFn(metric);
    }
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
    return Glean.metricsDatabase.getMetric<boolean>(ping, this);
  }
}

/**
 * A boolean metric instance to be used only by Glean.
 *
 * This implementation will allow callers to wait on the metrics recording
 */
export class BooleanMetricTypeInternal extends BooleanMetricType {
  constructor(meta: CommonMetricData) {
    super(meta);
  }

  async set(value: boolean): Promise<void> {
    let recordingAction = Promise.resolve();
    this.setInternal(value, (metric) => {
      recordingAction = Glean.metricsDatabase.record(this, metric);
    });

    await recordingAction;
  }
}

/**
 * A boolean metric instance to be exported for outside users.
 *
 * This implementation will _dispatch_ any recording functions.
 */
export class BooleanMetricTypeExternal extends BooleanMetricType {
  constructor(meta: CommonMetricData) {
    super(meta);
  }

  set(value: boolean): void {
    this.setInternal(value, (metric) => {
      Glean.dispatcher.launch(() => Glean.metricsDatabase.record(this, metric));
    });
  }
}
