/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import type MetricsDatabaseSync from "../database/sync.js";

import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric, MetricValidationError } from "../metric.js";
import {
  testOnlyCheck,
  truncateStringAtBoundaryWithError,
  truncateStringAtBoundaryWithErrorSync
} from "../../utils.js";
import { validateString } from "../utils.js";

const LOG_TAG = "core.metrics.StringMetricType";
export const MAX_LENGTH_VALUE = 100;

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

  /// SHARED ///
  set(value: string): void {
    if (Context.isPlatformSync()) {
      this.setSync(value);
    } else {
      this.setAsync(value);
    }
  }

  /// ASYNC ///
  setAsync(value: string) {
    Context.dispatcher.launch(() => this.setUndispatched(value));
  }

  /**
   * An implementation of `set` that does not dispatch the recording task.
   *
   * # Important
   *
   * This method should **never** be exposed to users.
   *
   * @param value The string we want to set to.
   */
  async setUndispatched(value: string): Promise<void> {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    try {
      const truncatedValue = await truncateStringAtBoundaryWithError(this, value, MAX_LENGTH_VALUE);
      const metric = new StringMetric(truncatedValue);
      await Context.metricsDatabase.record(this, metric);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        await e.recordError(this);
      }
    }
  }

  /// SYNC ///
  setSync(value: string) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    try {
      const truncatedValue = truncateStringAtBoundaryWithErrorSync(this, value, MAX_LENGTH_VALUE);
      const metric = new StringMetric(truncatedValue);
      (Context.metricsDatabase as MetricsDatabaseSync).record(this, metric);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordErrorSync(this);
      }
    }
  }

  /// TESTING ///
  async testGetValue(ping: string = this.sendInPings[0]): Promise<string | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let metric: string | undefined;
      await Context.dispatcher.testLaunch(async () => {
        metric = await Context.metricsDatabase.getMetric<string>(ping, this);
      });
      return metric;
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
  async testGetValue(ping: string = this.#inner.sendInPings[0]): Promise<string | undefined> {
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
