/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { JSONValue } from "../../utils.js";
import type { MetricValidationResult } from "../metric.js";
import type ErrorManagerSync from "../../error/sync.js";
import type MetricsDatabaseSync from "../database/sync.js";

import { isInteger } from "../../utils.js";
import TimeUnit from "../time_unit.js";
import { MetricType } from "../index.js";
import { isString, isObject, isUndefined, getMonotonicNow, testOnlyCheck } from "../../utils.js";
import { MetricValidation, MetricValidationError } from "../metric.js";
import { Metric } from "../metric.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.metrics.TimespanMetricType";

export type TimespanInternalRepresentation = {
  // The time unit of the metric type at the time of recording.
  timeUnit: TimeUnit;
  // The timespan in milliseconds.
  timespan: number;
};

export type TimespanPayloadRepresentation = {
  // The time unit of the metric type at the time of recording.
  time_unit: TimeUnit;
  // The timespan in the expected time_unit.
  value: number;
};

export class TimespanMetric extends Metric<
  TimespanInternalRepresentation,
  TimespanPayloadRepresentation
> {
  constructor(v: unknown) {
    super(v);
  }

  // The recorded timespan truncated to the given time unit.
  get timespan(): number {
    switch (this.inner.timeUnit) {
    case TimeUnit.Nanosecond:
      return this.inner.timespan * 10 ** 6;
    case TimeUnit.Microsecond:
      return this.inner.timespan * 10 ** 3;
    case TimeUnit.Millisecond:
      return this.inner.timespan;
    case TimeUnit.Second:
      return Math.round(this.inner.timespan / 1000);
    case TimeUnit.Minute:
      return Math.round(this.inner.timespan / 1000 / 60);
    case TimeUnit.Hour:
      return Math.round(this.inner.timespan / 1000 / 60 / 60);
    case TimeUnit.Day:
      return Math.round(this.inner.timespan / 1000 / 60 / 60 / 24);
    }
  }

  validateTimespan(v: unknown): MetricValidationResult {
    if (!isInteger(v)) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected integer value, got ${JSON.stringify(v)}`
      };
    }

    if (v < 0) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected positive value, got ${JSON.stringify(v)}`,
        errorType: ErrorType.InvalidValue
      };
    }

    return { type: MetricValidation.Success };
  }

  validate(v: unknown): MetricValidationResult {
    if (!isObject(v) || Object.keys(v).length !== 2 || !("timespan" in v) || !("timeUnit" in v)) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected timespan object, got ${JSON.stringify(v)}`
      };
    }

    const timespanVerification = this.validateTimespan(v.timespan);
    if (timespanVerification.type === MetricValidation.Error) {
      return timespanVerification;
    }

    const timeUnitVerification =
      "timeUnit" in v &&
      isString(v.timeUnit) &&
      Object.values(TimeUnit).includes(v.timeUnit as TimeUnit);
    if (!timeUnitVerification) {
      // We don't need super specific error messages for time unit verification,
      // because the this value will only be passed at construction time and glean_parser does that.
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected valid timeUnit for timespan, got ${JSON.stringify(v)}`
      };
    }

    return { type: MetricValidation.Success };
  }

  payload(): TimespanPayloadRepresentation {
    return {
      time_unit: this.inner.timeUnit,
      value: this.timespan
    };
  }
}

/**
 * Base implementation of the timespan metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the timespan metric type.
 */
export class InternalTimespanMetricType extends MetricType {
  private timeUnit: TimeUnit;
  startTime?: number;

  constructor(meta: CommonMetricData, timeUnit: string) {
    super("timespan", meta, TimespanMetric);
    this.timeUnit = timeUnit as TimeUnit;
  }

  /// SHARED ///
  start(): void {
    if (Context.isPlatformSync()) {
      this.startSync();
    } else {
      this.startAsync();
    }
  }

  stop(): void {
    if (Context.isPlatformSync()) {
      this.stopSync();
    } else {
      this.stopAsync();
    }
  }

  cancel(): void {
    if (Context.isPlatformSync()) {
      this.cancelSync();
    } else {
      this.cancelAsync();
    }
  }

  setRawNanos(elapsed: number): void {
    if (Context.isPlatformSync()) {
      this.setRawNanosSync(elapsed);
    } else {
      this.setRawNanosAsync(elapsed);
    }
  }

  /// ASYNC ///
  startAsync(): void {
    // Get the start time outside of the dispatched task so that
    // it is the time this function is called and not the time the task is executed.
    const startTime = getMonotonicNow();

    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      if (!isUndefined(this.startTime)) {
        await Context.errorManager.record(this, ErrorType.InvalidState, "Timespan already started");
        return;
      }

      this.startTime = startTime;
      return Promise.resolve();
    });
  }

  stopAsync(): void {
    // Get the stop time outside of the dispatched task so that
    // it is the time this function is called and not the time the task is executed.
    const stopTime = getMonotonicNow();

    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        // Reset timer when disabled, so that we don't record timespans across
        // disabled/enabled toggling.
        this.startTime = undefined;
        return;
      }

      if (isUndefined(this.startTime)) {
        await Context.errorManager.record(this, ErrorType.InvalidState, "Timespan not running.");
        return;
      }

      const elapsed = stopTime - this.startTime;
      this.startTime = undefined;

      if (elapsed < 0) {
        await Context.errorManager.record(this, ErrorType.InvalidState, "Timespan was negative.");
        return;
      }

      await this.setRawUndispatched(elapsed);
    });
  }

  cancelAsync(): void {
    Context.dispatcher.launch(() => {
      this.startTime = undefined;
      return Promise.resolve();
    });
  }

  setRawNanosAsync(elapsed: number): void {
    Context.dispatcher.launch(async () => {
      // `elapsed` is in nanoseconds in order to match the glean-core API.
      const elapsedMillis = elapsed * 10 ** -6;
      await this.setRawUndispatched(elapsedMillis);
    });
  }

  /**
   * An implementation of `setRaw` that does not dispatch the recording task.
   *
   * # Important
   *
   * This method should **never** be exposed to users.
   *
   * @param elapsed The elapsed time to record, in milliseconds.
   */
  async setRawUndispatched(elapsed: number): Promise<void> {
    await this.setRawAsync(elapsed);
  }

  async setRawAsync(elapsed: number) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (!isUndefined(this.startTime)) {
      await Context.errorManager.record(
        this,
        ErrorType.InvalidState,
        "Timespan already running. Raw value not recorded."
      );
      return;
    }

    let reportValueExists = false;
    try {
      const transformFn = ((elapsed) => {
        return (old?: JSONValue): TimespanMetric => {
          let metric: TimespanMetric;
          try {
            metric = new TimespanMetric(old);
            // If creating the metric didn't error,
            // there is a valid timespan already recorded for this metric.
            reportValueExists = true;
          } catch {
            // This may still throw in case elapsed in not the correct type.
            metric = new TimespanMetric({
              timespan: elapsed,
              timeUnit: this.timeUnit
            });
          }

          return metric;
        };
      })(elapsed);

      await Context.metricsDatabase.transform(this, transformFn);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        await e.recordError(this);
      }
    }

    if (reportValueExists) {
      await Context.errorManager.record(
        this,
        ErrorType.InvalidState,
        "Timespan value already recorded. New value discarded."
      );
    }
  }

  /// SYNC ///
  startSync(): void {
    // Get the start time outside of the dispatched task so that
    // it is the time this function is called and not the time the task is executed.
    const startTime = getMonotonicNow();

    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (!isUndefined(this.startTime)) {
      (Context.errorManager as ErrorManagerSync).record(
        this,
        ErrorType.InvalidState,
        "Timespan already started"
      );
      return;
    }

    this.startTime = startTime;
  }

  stopSync(): void {
    // Get the stop time outside of the dispatched task so that
    // it is the time this function is called and not the time the task is executed.
    const stopTime = getMonotonicNow();

    if (!this.shouldRecord(Context.uploadEnabled)) {
      // Reset timer when disabled, so that we don't record timespans across
      // disabled/enabled toggling.
      this.startTime = undefined;
      return;
    }

    if (isUndefined(this.startTime)) {
      (Context.errorManager as ErrorManagerSync).record(
        this,
        ErrorType.InvalidState,
        "Timespan not running."
      );
      return;
    }

    const elapsed = stopTime - this.startTime;
    this.startTime = undefined;

    if (elapsed < 0) {
      (Context.errorManager as ErrorManagerSync).record(
        this,
        ErrorType.InvalidState,
        "Timespan was negative."
      );
      return;
    }

    this.setRawSync(elapsed);
  }

  cancelSync(): void {
    this.startTime = undefined;
  }

  setRawNanosSync(elapsed: number): void {
    // `elapsed` is in nanoseconds in order to match the glean-core API.
    const elapsedMillis = elapsed * 10 ** -6;
    this.setRawSync(elapsedMillis);
  }

  setRawSync(elapsed: number) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (!isUndefined(this.startTime)) {
      (Context.errorManager as ErrorManagerSync).record(
        this,
        ErrorType.InvalidState,
        "Timespan already running. Raw value not recorded."
      );
      return;
    }

    let reportValueExists = false;
    try {
      const transformFn = ((elapsed) => {
        return (old?: JSONValue): TimespanMetric => {
          let metric: TimespanMetric;
          try {
            metric = new TimespanMetric(old);
            // If creating the metric didn't error,
            // there is a valid timespan already recorded for this metric.
            reportValueExists = true;
          } catch {
            // This may still throw in case elapsed in not the correct type.
            metric = new TimespanMetric({
              timespan: elapsed,
              timeUnit: this.timeUnit
            });
          }

          return metric;
        };
      })(elapsed);

      (Context.metricsDatabase as MetricsDatabaseSync).transform(this, transformFn);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordErrorSync(this);
      }
    }

    if (reportValueExists) {
      (Context.errorManager as ErrorManagerSync).record(
        this,
        ErrorType.InvalidState,
        "Timespan value already recorded. New value discarded."
      );
    }
  }

  /// TESTING ///
  async testGetValue(ping: string = this.sendInPings[0]): Promise<number | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let value: TimespanInternalRepresentation | undefined;
      await Context.dispatcher.testLaunch(async () => {
        value = await Context.metricsDatabase.getMetric<TimespanInternalRepresentation>(ping, this);
      });

      if (value) {
        return new TimespanMetric(value).timespan;
      }
    }
  }
}

/**
 * A timespan metric.
 *
 * Timespans are used to make a measurement of how much time
 * is spent in a particular task.
 */
export default class {
  #inner: InternalTimespanMetricType;

  constructor(meta: CommonMetricData, timeUnit: string) {
    this.#inner = new InternalTimespanMetricType(meta, timeUnit);
  }

  /**
   * Starts tracking time for the provided metric.
   *
   * This records an error if it's already tracking time (i.e. start was
   * already called with no corresponding `stop()`. In which case the original
   * start time will be preserved.
   */
  start(): void {
    this.#inner.start();
  }

  /**
   * Stops tracking time for the provided metric. Sets the metric to the elapsed time.
   *
   * This will record an error if no `start()` was called.
   */
  stop(): void {
    this.#inner.stop();
  }

  /**
   * Aborts a previous `start()` call.
   *
   * No error is recorded if no `start()` was called.
   */
  cancel(): void {
    this.#inner.cancel();
  }

  /**
   * Explicitly sets the timespan value.
   *
   * This API should only be used if your library or application requires
   * recording times in a way that can not make use of
   * {@link InternalTimespanMetricType#start}/{@link InternalTimespanMetricType#stop}.
   *
   * Care should be taken using this if the ping lifetime might contain more
   * than one timespan measurement. To be safe, this function should generally
   * be followed by sending a custom ping containing the timespan.
   *
   * @param elapsed The elapsed time to record, in nanoseconds.
   */
  setRawNanos(elapsed: number): void {
    this.#inner.setRawNanos(elapsed);
  }

  /**
   * Test-only API.**
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
