/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import type { JSONValue } from "../../utils.js";
import type MetricsDatabaseSync from "../database/sync.js";

import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { MetricValidationError, MetricValidation, Metric } from "../metric.js";
import { saturatingAdd, testOnlyCheck, isObject } from "../../utils.js";
import log from "../../log.js";
import { validatePositiveInteger } from "../utils.js";

const LOG_TAG = "core.metrics.RateMetricType";

export type Rate = {
  numerator: number;
  denominator: number;
};

export class RateMetric extends Metric<Rate, Rate> {
  constructor(v: unknown) {
    super(v);
  }

  get numerator(): number {
    return this.inner.numerator;
  }

  get denominator(): number {
    return this.inner.denominator;
  }

  validate(v: unknown): MetricValidationResult {
    if (!isObject(v) || Object.keys(v).length !== 2) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected Glean rate metric object, got ${JSON.stringify(v)}`
      };
    }

    const numeratorVerification = validatePositiveInteger(v.numerator);
    if (numeratorVerification.type === MetricValidation.Error) {
      return numeratorVerification;
    }

    const denominatorVerification = validatePositiveInteger(v.denominator);
    if (denominatorVerification.type === MetricValidation.Error) {
      return denominatorVerification;
    }

    return { type: MetricValidation.Success };
  }

  payload(): Rate {
    return this.inner;
  }
}

/**
 * Base implementation of the rate metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the rate metric type.
 */
class InternalRateMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("rate", meta, RateMetric);
  }

  /// SHARED ///
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
    this.add({
      denominator: 0,
      numerator: amount
    });
  }

  addToDenominator(amount: number): void {
    this.add({
      numerator: 0,
      denominator: amount
    });
  }

  /**
   * Adds a new rate value with the currently stored value.
   *
   * @param value The value to merge.
   */
  private add(value: Rate): void {
    if (Context.isPlatformSync()) {
      this.addSync(value);
    } else {
      this.addAsync(value);
    }
  }

  private transformFn(value: Rate) {
    return (v?: JSONValue): RateMetric => {
      const metric = new RateMetric(value);
      if (v) {
        try {
          const persistedMetric = new RateMetric(v);
          metric.set({
            numerator: saturatingAdd(metric.numerator, persistedMetric.numerator),
            denominator: saturatingAdd(metric.denominator, persistedMetric.denominator)
          });
        } catch {
          log(
            LOG_TAG,
            `Unexpected value found in storage for metric ${this.name}: ${JSON.stringify(
              v
            )}. Overwriting.`
          );
        }
      }
      return metric;
    };
  }

  /// ASYNC ///
  addAsync(value: Rate) {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      try {
        await Context.metricsDatabase.transform(this, this.transformFn(value));
      } catch (e) {
        if (e instanceof MetricValidationError) {
          await e.recordError(this);
        }
      }
    });
  }

  /// SYNC ///
  addSync(value: Rate) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    try {
      (Context.metricsDatabase as MetricsDatabaseSync).transform(this, this.transformFn(value));
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordErrorSync(this);
      }
    }
  }

  /// TESTING ///
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
 * * A denominator counting the amount of times something could have happened.
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
  async testGetNumRecordedErrors(
    errorType: string,
    ping: string = this.#inner.sendInPings[0]
  ): Promise<number> {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}
