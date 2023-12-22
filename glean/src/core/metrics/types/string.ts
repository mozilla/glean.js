/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";

import { Context } from "../../context.js";
import { MetricType } from "../index.js";
import { Metric, MetricValidationError } from "../metric.js";
import { validateString } from "../utils.js";
import { testOnlyCheck, truncateStringAtBytesBoundaryWithError } from "../../utils.js";

const LOG_TAG = "core.metrics.StringMetricType";
export const MAX_STRING_LENGTH_IN_BYTES = 100;

export class StringMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): MetricValidationResult {
    return validateString(v);
  }

  payload(): string {
    return this.inner;
  }
}

/**
 * Base implementation of the string metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the string metric type.
 */
export class InternalStringMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("string", meta, StringMetric);
  }

  set(value: string): void {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    try {
      const truncatedValue = truncateStringAtBytesBoundaryWithError(
        this,
        value,
        MAX_STRING_LENGTH_IN_BYTES
      );

      const metric = new StringMetric(truncatedValue);
      Context.metricsDatabase.record(this, metric);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordError(this);
      }
    }
  }

  /// TESTING ///
  testGetValue(ping: string = this.sendInPings[0]): string | undefined {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      return Context.metricsDatabase.getMetric<string>(ping, this);
    }
  }
}

/**
 * A string metric.
 *
 * Record an Unicode string value with arbitrary content.
 * Strings are length-limited to `MAX_LENGTH_VALUE` bytes.
 */
export default class {
  #inner: InternalStringMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalStringMetricType(meta);
  }

  /**
   * Sets to the specified string value.
   *
   * # Note
   *
   * Truncates the value if it is longer than `MAX_STRING_LENGTH` bytes
   * and logs an error.
   *
   * @param value the value to set.
   */
  set(value: string): void {
    this.#inner.set(value);
  }

  /**
   * Test-only API
   *
   * Gets the currently stored value as a string.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  testGetValue(ping: string = this.#inner.sendInPings[0]): string | undefined {
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
