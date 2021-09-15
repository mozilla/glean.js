/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";
import { isString, truncateStringAtBoundaryWithError } from "../../utils.js";

const LOG_TAG = "core.metrics.StringMetricType";
export const MAX_LENGTH_VALUE = 100;

export class StringMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is string {
    if (!isString(v)) {
      return false;
    }

    if (v.length > MAX_LENGTH_VALUE) {
      return false;
    }

    return true;
  }

  payload(): string {
    return this._inner;
  }
}

/**
 * A string metric.
 *
 * Record an Unicode string value with arbitrary content.
 * Strings are length-limited to `MAX_LENGTH_VALUE` bytes.
 */
class StringMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("string", meta);
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
   * @param value The string we want to set to.
   */
  static async _private_setUndispatched(instance: StringMetricType, value: string): Promise<void> {
    if (!instance.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    const truncatedValue = await truncateStringAtBoundaryWithError(instance, value, MAX_LENGTH_VALUE);
    const metric = new StringMetric(truncatedValue);
    await Context.metricsDatabase.record(instance, metric);
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
    Context.dispatcher.launch(
      () => StringMetricType._private_setUndispatched(this, value),
      `${LOG_TAG}.${this.baseIdentifier()}.set`
    );
  }

  /**
   * Test-only API**
   *
   * Gets the currently stored value as a string.
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

export default StringMetricType;
