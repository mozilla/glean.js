/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Metric, { CommonMetricData } from "metrics";
import Glean from "glean";
import { isNumber, isUndefined } from "utils";

export const MAX_LENGTH_VALUE = 100;

export type CounterMetricPayload = number;

/**
 * Checks whether or not `v` is a valid counter metric payload.
 *
 * # Note
 *
 * Not only will this verify if `v` is a number,
 * it will also check if it is greater than 0.
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating wether `v` is a valid string metric payload.
 */
export function isCounterMetricPayload(v: unknown): v is CounterMetricPayload {
  if (!isNumber(v)) {
    return false;
  }

  if (v <= 0) {
    return false;
  }

  return true;
}

/**
 * A counter metric.
 *
 * Used to count things.
 * The value can only be incremented, not decremented.
 */
class CounterMetric extends Metric {
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
  async add(amount?: number): Promise<void> {
    if (!this.shouldRecord()) {
      return;
    }

    if (isUndefined(amount)) {
      amount = 1;
    }

    if (amount <= 0) {
      // TODO: record error once Bug 1682574 is resolved.
      console.warn(`Attempted to add an invalid amount ${amount}. `);
      return;
    }

    const transformFn = ((amount) => {
      return (v?: CounterMetricPayload): CounterMetricPayload =>  {
        let result = v ? v + amount : amount;
        if (result > Number.MAX_SAFE_INTEGER) {
          result = Number.MAX_SAFE_INTEGER;
        }
        return result;
      };
    })(amount);

    await Glean.db.transform(this, transformFn);
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
  async testGetValue(ping: string): Promise<CounterMetricPayload | undefined> {
    return Glean.db.getMetric(ping, this);
  }
}

export default CounterMetric;
