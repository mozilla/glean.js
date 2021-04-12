/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import type { JSONValue } from "../../utils.js";
import { isUndefined } from "../../utils.js";
import Glean from "../../glean.js";
import { CounterMetric } from "./counter_metric.js";

/**
 * A counter metric.
 *
 * Used to count things.
 * The value can only be incremented, not decremented.
 */
class CounterMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("counter", meta);
  }

  /**
   * An internal implemention of `add` that does not dispatch the recording task.
   *
   * # Important
   *
   * This is absolutely not meant to be used outside of Glean itself.
   * It may cause multiple issues because it cannot guarantee
   * that the recording of the metric will happen in order with other Glean API calls.
   *
   * @param instance The metric instance to record to.
   * @param amount The amount we want to add.
   */
  static async _private_addUndispatched(instance: CounterMetricType, amount?: number): Promise<void> {
    if (!instance.shouldRecord(Glean.isUploadEnabled())) {
      return;
    }

    if (isUndefined(amount)) {
      amount = 1;
    }

    if (amount <= 0) {
      // TODO: record error once Bug 1682574 is resolved.
      console.warn(`Attempted to add an invalid amount ${amount}. Ignoring.`);
      return;
    }

    const transformFn = ((amount) => {
      return (v?: JSONValue): CounterMetric => {
        let metric: CounterMetric;
        let result: number;
        try {
          metric = new CounterMetric(v);
          result = metric.get() + amount;
        } catch {
          metric = new CounterMetric(amount);
          result = amount;
        }

        if (result > Number.MAX_SAFE_INTEGER) {
          result = Number.MAX_SAFE_INTEGER;
        }

        metric.set(result);
        return metric;
      };
    })(amount);

    await Glean.metricsDatabase.transform(instance, transformFn);
  }

  /**
   * Increases the counter by `amount`.
   *
   * # Note
   *
   * - Logs an error if the `amount` is 0 or negative.
   * - If the addition yields a number larger than Number.MAX_SAFE_INTEGER,
   *   Number.MAX_SAFE_INTEGER will be recorded.
   *
   * @param amount The amount to increase by. Should be positive.
   *               If not provided will default to `1`.
   */
  add(amount?: number): void {
    Glean.dispatcher.launch(async () => CounterMetricType._private_addUndispatched(this, amount));
  }

  /**
   * **Test-only API.**
   *
   * Gets the currently stored value as a number.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.sendInPings[0]): Promise<number | undefined> {
    let metric: number | undefined;
    await Glean.dispatcher.testLaunch(async () => {
      metric = await Glean.metricsDatabase.getMetric<number>(ping, this);
    });
    return metric;
  }
}

export default CounterMetricType;
