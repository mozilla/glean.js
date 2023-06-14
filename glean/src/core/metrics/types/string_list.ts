/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import type { JSONValue } from "../../utils.js";
import type ErrorManagerSync from "../../error/sync.js";
import type MetricsDatabaseSync from "../database/sync.js";

import { MetricType } from "../index.js";
import { Context } from "../../context.js";

import { Metric, MetricValidation, MetricValidationError } from "../metric.js";
import {
  testOnlyCheck,
  truncateStringAtBoundaryWithError,
  truncateStringAtBoundaryWithErrorSync
} from "../../utils.js";

import { ErrorType } from "../../error/error_type.js";
import log from "../../log.js";
import { validateString } from "../utils.js";

const LOG_TAG = "core.metrics.StringListMetricType";
export const MAX_LIST_LENGTH = 20;
export const MAX_STRING_LENGTH = 50;

export class StringListMetric extends Metric<string[], string[]> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): MetricValidationResult {
    if (!Array.isArray(v)) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected array, got ${JSON.stringify(v)}`
      };
    }

    for (const s of v) {
      const validation = validateString(s);
      if (validation.type === MetricValidation.Error) {
        return validation;
      }
    }

    return { type: MetricValidation.Success };
  }

  concat(list: unknown): void {
    const correctedList = this.validateOrThrow(list);
    const result = [...this.inner, ...correctedList];
    if (result.length > MAX_LIST_LENGTH) {
      throw new MetricValidationError(
        `String list length of ${result.length} would exceed maximum of ${MAX_LIST_LENGTH}.`,
        ErrorType.InvalidValue
      );
    }
    this.inner = result;
  }

  payload(): string[] {
    return this.inner;
  }
}

/**
 * Base implementation of the string list metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the string list metric type.
 */
class InternalStringListMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("string_list", meta, StringListMetric);
  }

  /// SHARED ///
  set(value: string[]): void {
    if (Context.isPlatformSync()) {
      this.setSync(value);
    } else {
      this.setAsync(value);
    }
  }

  add(value: string): void {
    if (Context.isPlatformSync()) {
      this.addSync(value);
    } else {
      this.addAsync(value);
    }
  }

  private addTransformFn(value: string) {
    return (v?: JSONValue): StringListMetric => {
      const metric = new StringListMetric([value]);
      try {
        v && metric.concat(v);
      } catch (e) {
        if (e instanceof MetricValidationError && e.type !== ErrorType.InvalidType) {
          // We only want to bubble up errors that are not invalid type,
          // those are only useful if if was the user that passed on an incorrect value
          // and in this context they would mean there is invalid data in the database.
          throw e;
        } else {
          log(
            LOG_TAG,
            `Unexpected value found in storage for metric ${this.name}: ${JSON.stringify(
              v
            )}. Overwriting.`
          );
        }
      }

      return metric;
    };
  }

  /// ASYNC ///
  setAsync(value: string[]) {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      try {
        if (value.length > MAX_LIST_LENGTH) {
          await Context.errorManager.record(
            this,
            ErrorType.InvalidValue,
            `String list length of ${value.length} exceeds maximum of ${MAX_LIST_LENGTH}.`
          );
        }

        // Create metric here, in order to run the validations and throw in case input in invalid.
        const metric = new StringListMetric(value);

        const truncatedList: string[] = [];
        for (let i = 0; i < Math.min(value.length, MAX_LIST_LENGTH); ++i) {
          const truncatedString = await truncateStringAtBoundaryWithError(
            this,
            value[i],
            MAX_STRING_LENGTH
          );
          truncatedList.push(truncatedString);
        }

        metric.set(truncatedList);
        await Context.metricsDatabase.record(this, metric);
      } catch (e) {
        if (e instanceof MetricValidationError) {
          await e.recordError(this);
        }
      }
    });
  }

  addAsync(value: string) {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      try {
        const truncatedValue = await truncateStringAtBoundaryWithError(
          this,
          value,
          MAX_STRING_LENGTH
        );

        await Context.metricsDatabase.transform(this, this.addTransformFn(truncatedValue));
      } catch (e) {
        if (e instanceof MetricValidationError) {
          await e.recordError(this);
        }
      }
    });
  }

  /// SYNC ///
  setSync(value: string[]) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    try {
      if (value.length > MAX_LIST_LENGTH) {
        (Context.errorManager as ErrorManagerSync).record(
          this,
          ErrorType.InvalidValue,
          `String list length of ${value.length} exceeds maximum of ${MAX_LIST_LENGTH}.`
        );
      }

      // Create metric here, in order to run the validations and throw in case input in invalid.
      const metric = new StringListMetric(value);

      const truncatedList: string[] = [];
      for (let i = 0; i < Math.min(value.length, MAX_LIST_LENGTH); ++i) {
        const truncatedString = truncateStringAtBoundaryWithErrorSync(
          this,
          value[i],
          MAX_STRING_LENGTH
        );
        truncatedList.push(truncatedString);
      }

      metric.set(truncatedList);
      (Context.metricsDatabase as MetricsDatabaseSync).record(this, metric);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordErrorSync(this);
      }
    }
  }

  addSync(value: string) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    try {
      const truncatedValue = truncateStringAtBoundaryWithErrorSync(this, value, MAX_STRING_LENGTH);

      (Context.metricsDatabase as MetricsDatabaseSync).transform(
        this,
        this.addTransformFn(truncatedValue)
      );
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordErrorSync(this);
      }
    }
  }

  /// TESTING ///
  async testGetValue(ping: string = this.sendInPings[0]): Promise<string[] | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let metric: string[] | undefined;
      await Context.dispatcher.testLaunch(async () => {
        metric = await Context.metricsDatabase.getMetric<string[]>(ping, this);
      });
      return metric;
    }
  }
}

export default class {
  #inner: InternalStringListMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalStringListMetricType(meta);
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
    this.#inner.set(value);
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
    this.#inner.add(value);
  }

  /**
   * Test-only API
   *
   * Gets the currently stored value as a string array.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.#inner.sendInPings[0]): Promise<string[] | undefined> {
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
