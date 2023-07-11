/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { JSONValue } from "../../utils.js";
import type { MetricValidationResult } from "../metric.js";
import type MetricsDatabaseSync from "../database/sync.js";

import { saturatingAdd, isUndefined, testOnlyCheck } from "../../utils.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric, MetricValidationError } from "../metric.js";
import log from "../../log.js";
import { validatePositiveInteger } from "../utils.js";

const LOG_TAG = "core.metrics.CounterMetricType";

export class CounterMetric extends Metric<number, number> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): MetricValidationResult {
    return validatePositiveInteger(v, false);
  }

  payload(): number {
    return this.inner;
  }

  saturatingAdd(amount: unknown): void {
    const correctAmount = this.validateOrThrow(amount);
    this.inner = saturatingAdd(this.inner, correctAmount);
  }

  set(amount: unknown) {
    const correctAmount = this.validateOrThrow(amount);
    this.inner = correctAmount;
  }
}

/**
 * Base implementation of the counter metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the counter metric type.
 */
export class InternalCounterMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("counter", meta, CounterMetric);
  }

  /// SHARED ///
  add(amount?: number): void {
    if (Context.isPlatformSync()) {
      this.addSync(amount);
    } else {
      this.addAsync(amount);
    }
  }

  private transformFn(amount: number) {
    return (v?: JSONValue): CounterMetric => {
      const metric = new CounterMetric(amount);
      if (v) {
        try {
          // Throws an error if v in not valid input.
          metric.saturatingAdd(v);
        } catch {
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
  addAsync(amount?: number) {
    Context.dispatcher.launch(async () => this.addUndispatched(amount));
  }

  /**
   * An implementation of `add` that does not dispatch the recording task.
   *
   * # Important
   *
   * This method should **never** be exposed to users.
   *
   * @param amount The amount we want to add.
   */
  async addUndispatched(amount?: number): Promise<void> {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (isUndefined(amount)) {
      amount = 1;
    }

    try {
      await Context.metricsDatabase.transform(this, this.transformFn(amount));
    } catch (e) {
      if (e instanceof MetricValidationError) {
        await e.recordError(this);
      }
    }
  }

  /// SYNC ///
  /**
   * A synchronous implementation of add.
   *
   * @param amount The amount we want to add.
   */
  addSync(amount?: number) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (isUndefined(amount)) {
      amount = 1;
    }

    try {
      (Context.metricsDatabase as MetricsDatabaseSync).transform(this, this.transformFn(amount));
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordErrorSync(this);
      }
    }
  }

  /**
   * Synchronously set the value of the metric. Used specifically when migrating
   * counter metrics from previous storage.
   *
   * # Important
   * This method should **never** be exposed to users. This is used solely
   * for migrating IDB data to LocalStorage.
   *
   * @param amount The new amount to set the counter to.
   */
  setSync(amount: number) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    try {
      (Context.metricsDatabase as MetricsDatabaseSync).transform(this, () => new CounterMetric(amount));
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordErrorSync(this);
      }
    }
  }

  /// TESTING ///
  async testGetValue(ping: string = this.sendInPings[0]): Promise<number | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let metric: number | undefined;
      await Context.dispatcher.testLaunch(async () => {
        metric = await Context.metricsDatabase.getMetric<number>(ping, this);
      });
      return metric;
    }
  }
}

/**
 * A counter metric.
 *
 * Used to count things.
 * The value can only be incremented, not decremented.
 */
export default class {
  #inner: InternalCounterMetricType;

  constructor(meta: CommonMetricData) {
    this.#inner = new InternalCounterMetricType(meta);
  }

  /**
   * Increases the counter by `amount`.
   *
   * # Note
   *
   * - Logs an error if the `amount` is 0 or negative.
   * - If the addition yields a number larger than Number.MAX_SAFE_INTEGER,
   *   Number.MAX_SAFE_INTEGER will be recorded.
   *
   * @param amount The amount to increase by. Should be positive.
   *               If not provided will default to `1`.
   */
  add(amount?: number): void {
    this.#inner.add(amount);
  }

  /**
   * Test-only API.
   *
   * Gets the currently stored value as a number.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.#inner.sendInPings[0]): Promise<number | undefined> {
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
