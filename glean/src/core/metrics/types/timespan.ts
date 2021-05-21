/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData} from "../index.js";
import type { JSONValue } from "../../utils.js";
import TimeUnit from "../time_unit.js";
import { MetricType } from "../index.js";
import { isString, isObject, isNumber, isUndefined, getMonotonicNow } from "../../utils.js";
import { Metric } from "../metric.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";

export type TimespanInternalRepresentation = {
  // The time unit of the metric type at the time of recording.
  timeUnit: TimeUnit,
  // The timespan in milliseconds.
  timespan: number,
};

export type TimespanPayloadRepresentation = {
  // The time unit of the metric type at the time of recording.
  time_unit: TimeUnit,
  // The timespan in the expected time_unit.
  value: number,
};

export class TimespanMetric extends Metric<TimespanInternalRepresentation, TimespanPayloadRepresentation> {
  constructor(v: unknown) {
    super(v);
  }

  // The recorded timespan truncated to the given time unit.
  get timespan(): number {
    switch(this._inner.timeUnit) {
      case TimeUnit.Nanosecond:
        return this._inner.timespan * 10**6;
      case TimeUnit.Microsecond:
        return this._inner.timespan * 10**3;
      case TimeUnit.Millisecond:
        return this._inner.timespan;
      case TimeUnit.Second:
        return Math.round(this._inner.timespan / 1000);
      case TimeUnit.Minute:
        return Math.round(this._inner.timespan / 1000 / 60);
      case TimeUnit.Hour:
        return Math.round(this._inner.timespan / 1000 / 60 / 60);
      case TimeUnit.Day:
        return Math.round(this._inner.timespan / 1000 / 60 / 60 / 24);
      }
  }

  validate(v: unknown): v is TimespanInternalRepresentation {
    if (!isObject(v) || Object.keys(v).length !== 2) {
      return false;
    }

    const timeUnitVerification = "timeUnit" in v && isString(v.timeUnit) && Object.values(TimeUnit).includes(v.timeUnit as TimeUnit);
    const timespanVerification = "timespan" in v && isNumber(v.timespan) && v.timespan >= 0;
    if (!timeUnitVerification || !timespanVerification) {
      return false;
    }

    return true;
  }

  payload(): TimespanPayloadRepresentation {
    return {
      time_unit: this._inner.timeUnit,
      value: this.timespan
    }
  }
}

/**
 * A timespan metric.
 *
 * Timespans are used to make a measurement of how much time is spent in a particular task.
 */
class TimespanMetricType extends MetricType {
  private timeUnit: TimeUnit;
  startTime?: number;

  constructor(meta: CommonMetricData, timeUnit: string) {
    super("timespan", meta);
    this.timeUnit = timeUnit as TimeUnit;
  }

  /**
   * An internal implemention of `setRaw` that does not dispatch the recording task.
   *
   * # Important
   *
   * This is absolutely not meant to be used outside of Glean itself.
   * It may cause multiple issues because it cannot guarantee
   * that the recording of the metric will happen in order with other Glean API calls.
   *
   * @param instance The metric instance to record to.
   * @param elapsed The elapsed time to record, in milliseconds.
   */
  static async _private_setRawUndispatched(instance: TimespanMetricType, elapsed: number): Promise<void> {
    if (!instance.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    if (!isUndefined(instance.startTime)) {
      await Context.errorManager.record(
        instance,
        ErrorType.InvalidState,
        "Timespan already running. Raw value not recorded."
      );
      return;
    }

    let reportValueExists = false;
    const transformFn = ((elapsed) => {
      return (old?: JSONValue): TimespanMetric => {
        let metric: TimespanMetric;
        try {
          metric = new TimespanMetric(old);
          // If creating the metric didn't error,
          // there is a valid timespan already recorded for this metric.
          reportValueExists = true;
        } catch {
          metric = new TimespanMetric({
            timespan: elapsed,
            timeUnit: instance.timeUnit,
          });
        }

        return metric;
      };
    })(elapsed);

    await Context.metricsDatabase.transform(instance, transformFn);

    if (reportValueExists) {
      await Context.errorManager.record(
        instance,
        ErrorType.InvalidState,
        "Timespan value already recorded. New value discarded."
      );
    }
  }

  /**
   * Starts tracking time for the provided metric.
   *
   * This records an error if it's already tracking time (i.e. start was
   * already called with no corresponding `stop()`. In which case the original
   * start time will be preserved.
   */
  start(): void {
    // Get the start time outside of the dispatched task so that
    // it is the time this function is called and not the time the task is executed.
    const startTime = getMonotonicNow();

    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      if (!isUndefined(this.startTime)) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidState,
          "Timespan already started"
        );
        return;
      }

      this.startTime = startTime;

      return Promise.resolve();
    });
  }

  /**
   * Stops tracking time for the provided metric. Sets the metric to the elapsed time.
   *
   * This will record an error if no `start()` was called.
   */
  stop(): void {
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
        await Context.errorManager.record(
          this,
          ErrorType.InvalidState,
          "Timespan not running"
        );
        return;
      }

      const elapsed = stopTime - this.startTime;
      this.startTime = undefined;

      if (elapsed < 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidState,
          "Timespan was negative."
        );
        return;
      }

      await TimespanMetricType._private_setRawUndispatched(this, elapsed);
    });
  }

  /**
   * Aborts a previous `start()` call.
   *
   * No error is recorded if no `start()` was called.
   */
  cancel(): void {
    Context.dispatcher.launch(() => {
      this.startTime = undefined;
      return Promise.resolve();
    });
  }

  /**
   * Explicitly sets the timespan value.
   *
   * This API should only be used if your library or application requires
   * recording times in a way that can not make use of
   * {@link TimespanMetricType#start}/{@link TimespanMetricType#stop}.
   *
   * Care should be taken using this if the ping lifetime might contain more
   * than one timespan measurement. To be safe, this function should generally
   * be followed by sending a custom ping containing the timespan.
   *
   * @param elapsed The elapsed time to record, in nanoseconds.
   */
  setRawNanos(elapsed: number): void {
    Context.dispatcher.launch(async () => {
      // `elapsed` is in nanoseconds in order to match the glean-core API.
      const elapsedMillis = elapsed * 10**(-6);
      await TimespanMetricType._private_setRawUndispatched(this, elapsedMillis);
    });
  }

  /**
   * Test-only API.**
   *
   * Gets the currently stored value as a number.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.sendInPings[0]): Promise<number | undefined> {
    let value: TimespanInternalRepresentation | undefined;
    await Context.dispatcher.testLaunch(async () => {
      value = await Context.metricsDatabase.getMetric<TimespanInternalRepresentation>(ping, this);
    });

    if (value) {
      return (new TimespanMetric(value)).timespan;
    }
  }
}

export default TimespanMetricType;

