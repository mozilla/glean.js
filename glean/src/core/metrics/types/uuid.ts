/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import { generateUUIDv4, isString } from "../../utils.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";
import { ErrorType, recordError, testGetNumRecordedErrors } from "../../error_recording.js";

// Loose UUID regex for checking if a string has a UUID _shape_. Does not contain version checks.
//
// This is necessary in order to accept non RFC compliant UUID values,
// which might be passed to Glean by legacy systems we aim to support e.g. Firefox Desktop.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class UUIDMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is string {
    if (!isString(v)) {
      return false;
    }

    return UUID_REGEX.test(v);
  }

  payload(): string {
    return this._inner;
  }
}

/**
 *  An UUID metric.
 *
 * Stores UUID v4 (randomly generated) values.
 */
class UUIDMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("uuid", meta);
  }

  /**
   * An internal implemention of `set` that does not dispatch the recording task.
   *
   * # Important
   *
   * This is absolutely not meant to be used outside of Glean itself.
   * It may cause multiple issues because it cannot guarantee
   * that the recording of the metric will happen in order with other Glean API calls.
   *
   * @param instance The metric instance to record to.
   * @param value The UUID we want to set to.
   */
  static async _private_setUndispatched(instance: UUIDMetricType, value: string): Promise<void> {
    if (!instance.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (!value) {
      value = generateUUIDv4();
    }

    let metric: UUIDMetric;
    try {
      metric = new UUIDMetric(value);
    } catch {
      await recordError(
        instance,
        ErrorType.InvalidValue,
        `"${value}" is not a valid UUID.`
      );
      return;
    }

    await Context.metricsDatabase.record(instance, metric);
  }

  /**
   * Sets to the specified value.
   *
   * @param value the value to set.
   *
   * @throws In case `value` is not a valid UUID.
   */
  set(value: string): void {
    Context.dispatcher.launch(() => UUIDMetricType._private_setUndispatched(this, value));
  }

  /**
   * Generates a new random uuid and sets the metric to it.
   *
   * @returns The generated value or `undefined` in case this metric shouldn't be recorded.
   */
  generateAndSet(): string | undefined {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    const value = generateUUIDv4();
    this.set(value);

    return value;
  }

  /**
   * **Test-only API**
   *
   * Gets the currently stored value as a string.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.sendInPings[0]): Promise<string | undefined> {
    let metric: string | undefined;
    await Context.dispatcher.testLaunch(async () => {
      metric = await Context.metricsDatabase.getMetric<string>(ping, this);
    });
    return metric;
  }

  /**
   * Returns the number of errors recorded for the given metric.
   *
   * @param errorType The type of the error recorded.
   * @param pingName represents the name of the ping to retrieve the metric for.
   *        Defaults to the first value in `sendInPings`.
   *
   * @return the number of errors recorded for the metric.
   */
   async testGetNumRecordedErrors(errorType: string, ping: string = this.sendInPings[0]): Promise<number> {
    return testGetNumRecordedErrors(this, errorType as ErrorType, ping);
  }
}

export default UUIDMetricType;
