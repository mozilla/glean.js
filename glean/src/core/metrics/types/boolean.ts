/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";
import { isBoolean, testOnly } from "../../utils.js";

const LOG_TAG = "core.metrics.BooleanMetricType";

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
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      const metric = new BooleanMetric(value);
      await Context.metricsDatabase.record(this, metric);
    });
  }

  /**
   * Test-only API**
   *
   * Gets the currently stored value as a boolean.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  @testOnly(LOG_TAG)
  async testGetValue(ping: string = this.sendInPings[0]): Promise<boolean | undefined> {
    let metric: boolean | undefined;
    await Context.dispatcher.testLaunch(async () => {
      metric = await Context.metricsDatabase.getMetric<boolean>(ping, this);
    });
    return metric;
  }
}

export default BooleanMetricType;
