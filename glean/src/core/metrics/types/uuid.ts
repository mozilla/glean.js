/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import { generateUUIDv4, isString, testOnlyCheck } from "../../utils.js";
import { Context } from "../../context.js";
import type { MetricValidationResult } from "../metric.js";
import { MetricValidationError } from "../metric.js";
import { MetricValidation } from "../metric.js";
import { Metric } from "../metric.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.metrics.UUIDMetricType";
// Loose UUID regex for checking if a string has a UUID _shape_. Does not contain version checks.
//
// This is necessary in order to accept non RFC compliant UUID values,
// which might be passed to Glean by legacy systems we aim to support e.g. Firefox Desktop.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UUIDMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): MetricValidationResult {
    if (!isString(v)) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected string, got ${typeof v}`
      };
    }

    if (!UUID_REGEX.test(v)) {
      return {
        type: MetricValidation.Error,
        errorMessage: `"${v}" is not a valid UUID`,
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
 * Base implementation of the UUID metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the UUID metric type.
 */
export class InternalUUIDMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("uuid", meta, UUIDMetric);
  }

  /**
   * An implemention of `set` that does not dispatch the recording task.
   *
   * # Important
   *
   * This method should **never** be exposed to users.
   *
   * @param value The UUID we want to set to.
   */
  async setUndispatched(value: string): Promise<void> {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (!value) {
      value = generateUUIDv4();
    }

    let metric: UUIDMetric;
    try {
      metric = new UUIDMetric(value);
      await Context.metricsDatabase.record(this, metric);
    } catch(e) {
      if(e instanceof MetricValidationError) {
        await e.recordError(this);
      }
    }
  }

  set(value: string): void {
    Context.dispatcher.launch(() => this.setUndispatched(value));
  }

  generateAndSet(): string | undefined {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    const value = generateUUIDv4();
    this.set(value);

    return value;
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
 *  An UUID metric.
 *
 * Stores UUID v4 (randomly generated) values.
 */
export default class {
  #inner: InternalUUIDMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalUUIDMetricType(meta);
  }

  /**
   * Sets to the specified value.
   *
   * @param value the value to set.
   * @throws In case `value` is not a valid UUID.
   */
  set(value: string): void {
    this.#inner.set(value);
  }

  /**
   * Generates a new random uuid and sets the metric to it.
   *
   * @returns The generated value or `undefined` in case this
   *          metric shouldn't be recorded.
   */
  generateAndSet(): string | undefined {
    return this.#inner.generateAndSet();
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
  async testGetNumRecordedErrors(errorType: string, ping: string = this.#inner.sendInPings[0]): Promise<number> {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}
