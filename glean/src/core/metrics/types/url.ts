/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { isString } from "../../utils.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.metrics.URLMetricType";

// The maximum number of characters a URL Metric may have, before encoding.
const URL_MAX_LENGTH = 2048;

// This regex only validates that the `scheme` part of the URL is spec compliant
// and is followed by a ":". After that anything is accepted.
//
// Reference: https://url.spec.whatwg.org/#url-scheme-string
const URL_VALIDATION_REGEX = /^[a-zA-Z][a-zA-Z0-9-\+\.]*:(.*)$/;

/**
 * Error thrown when there is a URL validation error that also yields error recording.
 */
class UrlMetricError extends Error {
  constructor(readonly type: ErrorType, message?: string) {
    super(message);
    this.name = "UrlMetricError";
  }
}

export class UrlMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  /**
   * Validates that a given value is a valid URL metric value.
   *
   * 1. The URL must be a string.
   * 2. The URL must have a maximum length of URL_MAX_LENGTH characters before the encoding.
   * 3. The URL must not be a data URL.
   * 4. Every URL must start with a valid scheme.
   *
   * Note: We explicitly do not validate if the URL is fully spec compliant,
   * the above validations are all that is done.
   *
   * @param v The value to validate.
   * @returns Whether or not v is a valid URL-like string.
   */
  validate(v: unknown): v is string {
    if (!isString(v)) {
      return false;
    }

    if (v.length > URL_MAX_LENGTH) {
      throw new UrlMetricError(
        ErrorType.InvalidOverflow,
        `URL length ${v.length} exceeds maximum of ${URL_MAX_LENGTH}.`
      );
    }

    if (v.startsWith("data:")) {
      throw new UrlMetricError(ErrorType.InvalidValue, "URL metric does not support data URLs.");
    }


    if (!URL_VALIDATION_REGEX.test(v)) {
      throw new UrlMetricError(
        ErrorType.InvalidValue, `"${v}" does not start with a valid URL scheme.`
      );
    }

    return true;
  }

  payload(): string {
    return encodeURI(this._inner);
  }
}

/**
 * A URL metric.
 */
class UrlMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("url", meta);
  }

  /**
   * Sets to a specified value.
   *
   * @param url the value to set.
   */
  set(url: string): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      try {
        const metric = new UrlMetric(url);
        await Context.metricsDatabase.record(this, metric);
      } catch (e) {
        if (e instanceof UrlMetricError) {
          await Context.errorManager.record(
            this,
            e.type,
            e.message
          );
        }
      }
    }, `${LOG_TAG}.${this.baseIdentifier()}.set`);
  }

  /**
   * Sets to a specified URL value.
   *
   * @param url the value to set.
   */
  setUrl(url: URL): void {
    this.set(url.toString());
  }

  /**
   * Test-only API.**
   *
   * Gets the currently stored value as a string.
   *
   * # Note
   *
   * Although URL metrics are URI encoded in the ping payload,
   * this function will return the unencoded URL for convenience.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.sendInPings[0]): Promise<string | undefined> {
    let metric: string | undefined;
    await Context.dispatcher.testLaunch(async () => {
      metric = await Context.metricsDatabase.getMetric<string>(ping, this);
    });
    return metric;
  }
}

export default UrlMetricType;
