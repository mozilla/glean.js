/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { isString, testOnlyCheck } from "../../utils.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import type { MetricValidationResult } from "../metric.js";
import { MetricValidationError } from "../metric.js";
import { MetricValidation } from "../metric.js";
import { Metric } from "../metric.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.metrics.URLMetricType";
// The maximum number of characters a URL Metric may have.
const URL_MAX_LENGTH = 2048;

// This regex only validates that the `scheme` part of the URL is spec compliant
// and is followed by a ":". After that anything is accepted.
//
// Reference: https://url.spec.whatwg.org/#url-scheme-string
const URL_VALIDATION_REGEX = /^[a-zA-Z][a-zA-Z0-9-\+\.]*:(.*)$/;

export class UrlMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  /**
   * Validates that a given value is a valid URL metric value.
   *
   * 1. The URL must be a string.
   * 2. The URL must have a maximum length of URL_MAX_LENGTH characters.
   * 3. The URL must not be a data URL.
   * 4. Every URL must start with a valid scheme.
   *
   * Note: We explicitly do not validate if the URL is fully spec compliant,
   * the above validations are all that is done.
   *
   * @param v The value to validate.
   * @returns Whether or not v is a valid URL-like string.
   */
  validate(v: unknown): MetricValidationResult {
    if (!isString(v)) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected string, got ${typeof v}`
      };
    }

    if (v.length > URL_MAX_LENGTH) {
      return {
        type: MetricValidation.Error,
        errorMessage: `URL length ${v.length} exceeds maximum of ${URL_MAX_LENGTH}`,
        errorType: ErrorType.InvalidOverflow,
      };
    }

    if (v.startsWith("data:")) {
      return {
        type: MetricValidation.Error,
        errorMessage: "URL metric does not support data URLs",
        errorType: ErrorType.InvalidValue,
      };
    }


    if (!URL_VALIDATION_REGEX.test(v)) {
      return {
        type: MetricValidation.Error,
        errorMessage: `"${v}" does not start with a valid URL scheme`,
        errorType: ErrorType.InvalidValue,
      };
    }

    return { type: MetricValidation.Success };
  }

  payload(): string {
    return this._inner;
  }
}

/**
 * Base implementation of the URL metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the URL metric type.
 */
class InternalUrlMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("url", meta, UrlMetric);
  }

  set(url: string): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      try {
        const metric = new UrlMetric(url);
        await Context.metricsDatabase.record(this, metric);
      } catch (e) {
        if (e instanceof MetricValidationError) {
          await e.recordError(this);
        }
      }
    });
  }

  setUrl(url: URL): void {
    this.set(url.toString());
  }

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
 * A URL metric.
 */
export default class {
  #inner: InternalUrlMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalUrlMetricType(meta);
  }

  /**
   * Sets to a specified value.
   *
   * @param url the value to set.
   */
  set(url: string): void {
    this.#inner.set(url);
  }

  /**
   * Sets to a specified URL value.
   *
   * @param url the value to set.
   */
  setUrl(url: URL): void {
    this.#inner.setUrl(url);
  }

  /**
   * Test-only API.**
   *
   * Gets the currently stored value as a string.
   *
   * # Note
   *
   * this function will return the unencoded URL for convenience.
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
  async testGetNumRecordedErrors(errorType: string, ping: string = this.#inner.sendInPings[0]): Promise<number> {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}

