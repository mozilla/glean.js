/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { JSONValue } from "../../utils.js";
import { MetricType } from "../index.js";
import { isUndefined, isInteger, testOnlyCheck } from "../../utils.js";
import { Context } from "../../context.js";
import { Metric } from "../metric.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.metrics.CounterMetricType";

export class CounterMetric extends Metric<number, number> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is number {
    if (!isInteger(v)) {
      return false;
    }

    if (v <= 0) {
      return false;
    }

    return true;
  }

  payload(): number {
    return this._inner;
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

  /**
   * An implemention of `add` that does not dispatch the recording task.
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

    if (amount <= 0) {
      await Context.errorManager.record(
        this,
        ErrorType.InvalidValue,
        `Added negative and zero value ${amount}`
      );
      return;
    }

    const transformFn = ((amount) => {
      return (v?: JSONValue): CounterMetric => {
        let metric: CounterMetric;
        let result: number;
        try {
          metric = new CounterMetric(v);
          result = metric.get() + amount;
        } catch {
          metric = new CounterMetric(amount);
          result = amount;
        }

        if (result > Number.MAX_SAFE_INTEGER) {
          result = Number.MAX_SAFE_INTEGER;
        }

        metric.set(result);
        return metric;
      };
    })(amount);

    await Context.metricsDatabase.transform(this, transformFn);
  }

  add(amount?: number): void {
    Context.dispatcher.launch(async () => this.addUndispatched(amount));
  }

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
  async testGetNumRecordedErrors(errorType: string, ping: string = this.#inner.sendInPings[0]): Promise<number> {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}
