/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import type MetricsDatabaseSync from "../database/sync.js";

import {
  testOnlyCheck,
  truncateStringAtBoundaryWithError,
  truncateStringAtBoundaryWithErrorSync
} from "../../utils.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { MetricValidationError } from "../metric.js";
import { Metric } from "../metric.js";
import { validateString } from "../utils.js";

const LOG_TAG = "core.metrics.TextMetricType";
// The maximum number of characters for text.
export const TEXT_MAX_LENGTH = 200 * 1024;

export class TextMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  /**
   * Validates that a given value is within bounds.
   *
   * @param v The value to validate.
   * @returns Whether or not v is valid text data.
   */
  validate(v: unknown): MetricValidationResult {
    return validateString(v);
  }

  payload(): string {
    return this.inner;
  }
}

/**
 * Base implementation of the text metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the text metric type.
 */
class InternalTextMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("text", meta, TextMetric);
  }

  /// SHARED ///
  set(text: string): void {
    if (Context.isPlatformSync()) {
      this.setSync(text);
    } else {
      this.setAsync(text);
    }
  }

  /// ASYNC ///
  setAsync(text: string) {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      try {
        const truncatedValue = await truncateStringAtBoundaryWithError(this, text, TEXT_MAX_LENGTH);
        const metric = new TextMetric(truncatedValue);
        await Context.metricsDatabase.record(this, metric);
      } catch (e) {
        if (e instanceof MetricValidationError) {
          await e.recordError(this);
        }
      }
    });
  }

  /// SYNC ///
  setSync(text: string) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    try {
      const truncatedValue = truncateStringAtBoundaryWithErrorSync(this, text, TEXT_MAX_LENGTH);
      const metric = new TextMetric(truncatedValue);
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
 * A text metric.
 */
export default class {
  #inner: InternalTextMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalTextMetricType(meta);
  }

  /**
   * Sets to a specified value.
   *
   * @param text the value to set.
   */
  set(text: string): void {
    this.#inner.set(text);
  }

  /**
   * Test-only API.**
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
