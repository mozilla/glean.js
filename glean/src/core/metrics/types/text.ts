/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { isString, truncateStringAtBoundaryWithError } from "../../utils.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";

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
  validate(v: unknown): v is string {
    if (!isString(v)) {
      return false;
    }

    if (v.length > TEXT_MAX_LENGTH) {
      return false;
    }

    return true;
  }

  payload(): string {
    return this._inner;
  }
}

/**
 * A text metric.
 */
class TextMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("text", meta);
  }

  /**
   * Sets to a specified value.
   *
   * @param text the value to set.
   */
  set(text: string): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      const truncatedValue = await truncateStringAtBoundaryWithError(this, text, TEXT_MAX_LENGTH);
      const metric = new TextMetric(truncatedValue);
      await Context.metricsDatabase.record(this, metric);
    });
  }

  /**
   * Test-only API.**
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

export default TextMetricType;
