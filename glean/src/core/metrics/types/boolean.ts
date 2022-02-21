/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";
import { isBoolean, testOnlyCheck } from "../../utils.js";

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

class InternalBooleanMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("boolean", meta, BooleanMetric);
  }

  set(value: boolean): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      const metric = new BooleanMetric(value);
      await Context.metricsDatabase.record(this, metric);
    });
  }

  async testGetValue(ping: string = this.sendInPings[0]): Promise<boolean | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let metric: boolean | undefined;
      await Context.dispatcher.testLaunch(async () => {
        metric = await Context.metricsDatabase.getMetric<boolean>(ping, this);
      });
      return metric;
    }
  }
}

/**
 *  A boolean metric.
 *
 * Records a simple flag.
 */
export default class {
  #inner: InternalBooleanMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalBooleanMetricType(meta);
  }

  /**
   * Sets to the specified boolean value.
   *
   * @param value the value to set.
   */
  set(value: boolean): void {
    this.#inner.set(value);
  }

  /**
   * Test-only API
   *
   * Gets the currently stored value as a boolean.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.#inner.sendInPings[0]): Promise<boolean | undefined> {
    return this.#inner.testGetValue(ping);
  }

  /**
   * Test-only API
   *
   * Returns the number of errors recorded for the given metric.
   *
   * @param errorType The type of the error recorded.
   * @param ping represents the name of the ping to retrieve the metric for.
   *        Defaults to the first value in `sendInPings`.
   * @returns the number of errors recorded for the metric.
   */
  async testGetNumRecordedErrors(errorType: string, ping: string = this.#inner.sendInPings[0]): Promise<number> {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}
