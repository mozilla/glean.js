/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";
import { isString, truncateStringAtBoundaryWithError } from "../../utils.js";
import type { JSONValue } from "../../utils.js";
import { ErrorType } from "../../error/error_type.js";

export const MAX_LIST_LENGTH = 20;
export const MAX_STRING_LENGTH = 50;

export class StringListMetric extends Metric<string[], string[]> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is string[] {
    if (!Array.isArray(v)) {
      return false;
    }

    if (v.length > MAX_LIST_LENGTH) {
      return false;
    }

    for (const s of v) {
      if (!isString(s) || s.length > MAX_STRING_LENGTH) {
        return false;
      }
    }

    return true;
  }

  payload(): string[] {
    return this._inner;
  }
}

/**
 * A string list metric.
 *
 * This allows appending a string value with arbitrary content to a list.
 * The list is length-limited to `MAX_LIST_LENGTH`.
 * Strings are length-limited to `MAX_STRING_LENGTH` characters.
 */
class StringListMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("string_list", meta);
  }

  /**
   * Sets to the specified string list value.
   *
   * # Note
   *
   * Truncates the list if it is longer than `MAX_LIST_LENGTH` and records an error.
   *
   * Truncates the value if it is longer than `MAX_STRING_LENGTH` characters
   * and records an error.
   *
   * @param value The list of strings to set the metric to.
   */
  set(value: string[]): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      const truncatedList: string[] = [];
      if (value.length > MAX_LIST_LENGTH) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidValue,
          `String list length of ${value.length} exceeds maximum of ${MAX_LIST_LENGTH}.`
        );
      }

      for (let i = 0; i < Math.min(value.length, MAX_LIST_LENGTH); ++i) {
        const truncatedString = await truncateStringAtBoundaryWithError(this, value[i], MAX_STRING_LENGTH);
        truncatedList.push(truncatedString);
      }
      const metric = new StringListMetric(truncatedList);
      await Context.metricsDatabase.record(this, metric);
    });
  }

  /**
   * Adds a new string `value` to the list.
   *
   * # Note
   *
   * - If the list is already of length `MAX_LIST_LENGTH`, record an error.
   * - Truncates the value if it is longer than `MAX_STRING_LENGTH` characters
   * and records an error.
   *
   * @param value The string to add.
   */
  add(value: string): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      const truncatedValue = await truncateStringAtBoundaryWithError(this, value, MAX_STRING_LENGTH);
      let currentLen = 0;

      const transformFn = ((value) => {
        return (v?: JSONValue): StringListMetric => {
          let metric: StringListMetric;
          let result: string[];
          try {
            metric = new StringListMetric(v);
            result = metric.get();
            currentLen = result.length;
            if (result.length < MAX_LIST_LENGTH) {
              result.push(value);
            }
          } catch {
            metric = new StringListMetric([value]);
            result = [value];
          }
          metric.set(result);
          return metric;
        };
      })(truncatedValue);

      await Context.metricsDatabase.transform(this, transformFn);

      if (currentLen >= MAX_LIST_LENGTH) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidValue,
          `String list length of ${currentLen+1} exceeds maximum of ${MAX_LIST_LENGTH}.`
        );
      }
    });
  }

  /**
   * Test-only API**
   *
   * Gets the currently stored value as a string array.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.sendInPings[0]): Promise<string[] | undefined> {
    let metric: string[] | undefined;
    await Context.dispatcher.testLaunch(async () => {
      metric = await Context.metricsDatabase.getMetric<string[]>(ping, this);
    });
    return metric;
  }
}

export default StringListMetricType;
