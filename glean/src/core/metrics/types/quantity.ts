/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";

import { MetricType } from "../index.js";
import { testOnlyCheck } from "../../utils.js";
import { Context } from "../../context.js";
import { Metric, MetricValidationError } from "../metric.js";
import { validatePositiveInteger } from "../utils.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.metrics.QuantityMetricType";

export class QuantityMetric extends Metric<number, number> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): MetricValidationResult {
    return validatePositiveInteger(v);
  }

  payload(): number {
    return this.inner;
  }
}

/**
 * Base implementation of the quantity metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the quantity metric type.
 */
class InternalQuantityMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("quantity", meta, QuantityMetric);
  }

  set(value: number): void {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (value < 0) {
      Context.errorManager.record(
        this,
        ErrorType.InvalidValue,
        `Set negative value ${value}`
      );
      return;
    }

    if (value > Number.MAX_SAFE_INTEGER) {
      value = Number.MAX_SAFE_INTEGER;
    }

    try {
      const metric = new QuantityMetric(value);
      Context.metricsDatabase.record(this, metric);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordError(this);
      }
    }
  }

  /// TESTING ///
  testGetValue(ping: string = this.sendInPings[0]): number | undefined {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      return Context.metricsDatabase.getMetric<number>(ping, this);
    }
  }
}

/**
 * A quantity metric.
 *
 * Used to store quantity.
 * The value can only be non-negative.
 */
export default class {
  #inner: InternalQuantityMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalQuantityMetricType(meta);
  }

  /**
   * Sets to the specified quantity value.
   * Logs an warning if the value is negative.
   *
   * @param value the value to set. Must be non-negative
   */
  set(value: number): void {
    this.#inner.set(value);
  }

  /**
   * Test-only API.**
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
