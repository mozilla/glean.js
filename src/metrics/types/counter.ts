/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Metric, MetricType, CommonMetricData } from "metrics";
import { isNumber, isUndefined, JSONValue } from "utils";
import Glean from "glean";

export class CounterMetric extends Metric<number, number> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is number {
    if (!isNumber(v)) {
      return false;
    }

    if (v <= 0) {
      return false;
    }

    return true;
  }

  payload(): number {
    return this._inner;
  }
}

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
    Glean.dispatcher.launch(async () => {
      if (!this.shouldRecord()) {
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
  
      await Glean.metricsDatabase.transform(this, transformFn);
    });
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
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string): Promise<number | undefined> {
    let metric: number | undefined;
    await Glean.dispatcher.testLaunch(async () => {
      metric = await Glean.metricsDatabase.getMetric<number>(ping, this);
    });
    return metric;
  }
}

export default CounterMetricType;
