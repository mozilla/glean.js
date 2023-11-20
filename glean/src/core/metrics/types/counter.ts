/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { JSONValue } from "../../utils.js";
import type { MetricValidationResult } from "../metric.js";

import { saturatingAdd, isUndefined, testOnlyCheck } from "../../utils.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric, MetricValidationError } from "../metric.js";
import log from "../../log.js";
import { validatePositiveInteger } from "../utils.js";

const LOG_TAG = "core.metrics.CounterMetricType";

export class CounterMetric extends Metric<number, number> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): MetricValidationResult {
    return validatePositiveInteger(v, false);
  }

  payload(): number {
    return this.inner;
  }

  saturatingAdd(amount: unknown): void {
    const correctAmount = this.validateOrThrow(amount);
    this.inner = saturatingAdd(this.inner, correctAmount);
  }
}

/**
 * Base implementation of the counter metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the counter metric type.
 */
export class InternalCounterMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("counter", meta, CounterMetric);
  }

  add(amount?: number): void {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (isUndefined(amount)) {
      amount = 1;
    }

    try {
      Context.metricsDatabase.transform(this, this.transformFn(amount));
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordError(this);
      }
    }
  }

  private transformFn(amount: number) {
    return (v?: JSONValue): CounterMetric => {
      const metric = new CounterMetric(amount);
      if (v) {
        try {
          // Throws an error if v in not valid input.
          metric.saturatingAdd(v);
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

  /// TESTING ///
  testGetValue(ping: string = this.sendInPings[0]): number | undefined {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      return Context.metricsDatabase.getMetric<number>(ping, this);
    }
  }
}

/**
 * A counter metric.
 *
 * Used to count things.
 * The value can only be incremented, not decremented.
 */
export default class {
  #inner: InternalCounterMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalCounterMetricType(meta);
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
    this.#inner.add(amount);
  }

  /**
   * Test-only API.
   *
   * Gets the currently stored value as a number.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  testGetValue(ping: string = this.#inner.sendInPings[0]): number | undefined {
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
  testGetNumRecordedErrors(errorType: string, ping: string = this.#inner.sendInPings[0]): number {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}
