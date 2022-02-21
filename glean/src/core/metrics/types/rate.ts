/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";
import { testOnlyCheck } from "../../utils.js";
import { isNumber, isObject } from "../../utils.js";
import type { JSONValue } from "../../utils.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.metrics.RateMetricType";

export type Rate = {
  numerator: number,
  denominator: number
};

export class RateMetric extends Metric<Rate, Rate> {
  constructor(v: unknown) {
    super(v);
  }

  get numerator(): number {
    return this._inner.numerator;
  }

  get denominator(): number {
    return this._inner.denominator;
  }

  validate(v: unknown): v is Rate {
    if (!isObject(v) || Object.keys(v).length !== 2) {
      return false;
    }

    const numeratorVerification = "numerator" in v && isNumber(v.numerator) && v.numerator >= 0;
    const denominatorVerification = "denominator" in v && isNumber(v.denominator) && v.denominator >= 0;
    return numeratorVerification && denominatorVerification;
  }

  payload(): Rate {
    return {
      numerator: this._inner.numerator,
      denominator: this._inner.denominator
    };
  }
}

class InternalRateMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("rate", meta, RateMetric);
  }

  addToNumerator(amount: number): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      if (amount < 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidValue,
          `Added negative value ${amount} to numerator.`
        );
        return;
      }

      const transformFn = ((amount) => {
        return (v?: JSONValue): RateMetric => {
          let metric: RateMetric;
          let result: number;
          try {
            metric = new RateMetric(v);
            result = metric.numerator + amount;
          } catch {
            metric = new RateMetric({
              numerator: amount,
              denominator: 0
            });
            result = amount;
          }

          if (result > Number.MAX_SAFE_INTEGER) {
            result = Number.MAX_SAFE_INTEGER;
          }

          metric.set({
            numerator: result,
            denominator: metric.denominator
          });
          return metric;
        };
      })(amount);

      await Context.metricsDatabase.transform(this, transformFn);
    });
  }

  addToDenominator(amount: number): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      if (amount < 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidValue,
          `Added negative value ${amount} to denominator.`
        );
        return;
      }

      const transformFn = ((amount) => {
        return (v?: JSONValue): RateMetric => {
          let metric: RateMetric;
          let result: number;
          try {
            metric = new RateMetric(v);
            result = metric.denominator + amount;
          } catch {
            metric = new RateMetric({
              numerator: 0,
              denominator: amount
            });
            result = amount;
          }

          if (result > Number.MAX_SAFE_INTEGER) {
            result = Number.MAX_SAFE_INTEGER;
          }

          metric.set({
            numerator: metric.numerator,
            denominator: result
          });
          return metric;
        };
      })(amount);

      await Context.metricsDatabase.transform(this, transformFn);
    });
  }

  async testGetValue(ping: string = this.sendInPings[0]): Promise<Rate | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let metric: Rate | undefined;
      await Context.dispatcher.testLaunch(async () => {
        metric = await Context.metricsDatabase.getMetric<Rate>(ping, this);
      });
      return metric;
    }
  }
}

/*
 * A rate metric.
 *
 * Used to determine the proportion of things via two counts:
 * * A numerator defining the amount of times something happened,
 * * A denominator counting the amount of times someting could have happened.
 *
 * Both numerator and denominator can only be incremented, not decremented.
 */
export default class {
  #inner: InternalRateMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalRateMetricType(meta);
  }

  /**
   * Increases the numerator by amount.
   *
   * # Note
   *
   * Records an `InvalidValue` error if the `amount` is negative.
   *
   * @param amount The amount to increase by. Should be non-negative.
   */
  addToNumerator(amount: number): void {
    this.#inner.addToNumerator(amount);
  }

  /**
   * Increases the denominator by amount.
   *
   * # Note
   *
   * Records an `InvalidValue` error if the `amount` is negative.
   *
   * @param amount The amount to increase by. Should be non-negative.
   */
  addToDenominator(amount: number): void {
    this.#inner.addToDenominator(amount);
  }

  /**
   * Test-only API.**
   *
   * Gets the currently stored value as an object.
   *
   * # Note
   *
   * This function will return the Rate for convenience.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.#inner.sendInPings[0]): Promise<Rate | undefined> {
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
