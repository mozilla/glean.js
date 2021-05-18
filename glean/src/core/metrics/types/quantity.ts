/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import { isNumber } from "../../utils.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";
import { ErrorType } from "../../error/error_type.js";

export class QuantityMetric extends Metric<number, number> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is number {
    if (!isNumber(v)) {
      return false;
    }

    if (v < 0) {
      return false;
    }

    return true;
  }

  payload(): number {
    return this._inner;
  }
}

/**
 * A quantity metric.
 *
 * Used to store quantity.
 * The value can only be non-negative.
 */
class QuantityMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("quantity", meta);
  }

  /**
   * An internal implemention of `set` that does not dispatch the recording task.
   *
   * # Important
   *
   * This is absolutely not meant to be used outside of Glean itself.
   * It may cause multiple issues because it cannot guarantee
   * that the recording of the metric will happen in order with other Glean API calls.
   *
   * @param instance The metric instance to record to.
   * @param value The string we want to set to.
   */
  static async _private_setUndispatched(instance: QuantityMetricType, value: number): Promise<void> {
    if (!instance.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (value < 0) {
      await Context.errorManager.record(
        instance,
        ErrorType.InvalidValue,
        `Set negative value ${value}`
      );
      return;
    }

    if (value > Number.MAX_SAFE_INTEGER) {
      value = Number.MAX_SAFE_INTEGER;
    }

    const metric = new QuantityMetric(value);
    await Context.metricsDatabase.record(instance, metric);
  }

  /**
   * Sets to the specified quantity value.
   * Logs an warning if the value is negative.
   *
   * @param value the value to set. Must be non-negative
   */
  set(value: number): void {
    Context.dispatcher.launch(() => QuantityMetricType._private_setUndispatched(this, value));
  }

  /**
   * Test-only API.**
   *
   * Gets the currently stored value as a number.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.sendInPings[0]): Promise<number | undefined> {
    let metric: number | undefined;
    await Context.dispatcher.testLaunch(async () => {
      metric = await Context.metricsDatabase.getMetric<number>(ping, this);
    });
    return metric;
  }
}

export default QuantityMetricType;
