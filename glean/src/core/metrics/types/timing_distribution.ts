/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { JSONValue } from "../../utils.js";
import type { MetricValidationResult } from "../metric";
import type TimeUnit from "../time_unit.js";
import type { Histogram } from "../../../histogram/histogram.js";

import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric, MetricValidation, MetricValidationError } from "../metric.js";
import { ErrorType } from "../../error/error_type.js";
import { constructFunctionalHistogramFromValues } from "../../../histogram/functional.js";
import {
  convertTimeUnitToNanos,
  getCurrentTimeInNanoSeconds,
  isUndefined,
  testOnlyCheck,
} from "../../utils.js";

const LOG_TAG = "core.metrics.TimingDistributionMetricType";

// Maximum time, which means we retain a maximum of 316 buckets.
// It is automatically adjusted based on the `timeUnit` parameter
// so that:
//
// - `nanosecond` - 10 minutes
// - `microsecond` - ~6.94 days
// - `millisecond` - ~19 years
const MAX_SAMPLE_TIME = 1000 * 1000 * 1000 * 60 * 10;

// name as TimerId for readability
type TimerId = number;

// The internals of Glean are not setup to store complex objects. Everything
// that gets stored needs to be some sort of JSON parse-able value. We are able
// to work with this by doing a few things.
//
// 1. We store the `startTimes` internally in a `Record`. There is never a point
//    where we need both the start time and the duration since the duration is
//    only calculated once the timer is stopped.
//
// 2. Every time that a timer is ended, we append that duration to the existing
//    duration array stored in Glean. This allows us to store a simple, parse-able
//    object while still having everything we need.
//
// 3. When it comes time to provide data to the user about the distribution, we are
//    able to construct a histogram from those values. At no other point do we need
//    any data specific to the histogram. The keys of the histogram (buckets) aren't
//    always a 1:1 match with the actual durations, so trying to store our keys or
//    any other histogram data just causes more headaches.
//
type TimingDistributionInternalRepresentation = number[];

export type TimingDistributionPayloadRepresentation = {
  // A map containing the bucket index mapped to the accumulated count.
  //
  // This can contain buckets with a count of `0`.
  values: Record<TimerId, number>;

  // The accumulated sum of all the samples in the distribution.
  sum: number;
};

interface DistributionData {
  // A map containing the bucket index mapped to the accumulated count.
  //
  // This can contain buckets with a count of `0`.
  values: Record<number, number>;

  // The accumulated sum of all the samples in the distribution.
  sum: number;

  // The number of entries in the histogram.
  count: number;
}

/**
 * Create a snapshot of the histogram with a time unit.
 *
 * Utility function for testing.
 *
 * **Caution**
 * This cannot use `Histogram.snapshot_values` and needs to use the more
 * specialized snapshot function.
 *
 * @param hist Histogram to get the snapshot of
 * @returns Snapshot of the current histogram
 */
export function snapshot(hist: Histogram): DistributionData {
  const snapshotValues = hist.snapshotValues();

  const utilizedValues: Record<number, number> = {};
  Object.entries(snapshotValues).forEach(([key, value]) => {
    const numericKey = Number(key);
    if (value > 0 && !isNaN(numericKey)) {
      utilizedValues[numericKey] = value;
    }
  });

  return {
    count: hist.count,
    values: utilizedValues,
    sum: hist.sum,
  };
}

export class TimingDistributionMetric extends Metric<
  TimingDistributionInternalRepresentation,
  TimingDistributionPayloadRepresentation
> {
  constructor(v: unknown) {
    super(v);
  }

  get timingDistribution(): Record<number, number> {
    return this._inner;
  }

  validate(v: unknown): MetricValidationResult {
    // Check that array is valid
    if (isUndefined(v) || !Array.isArray(v)) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidType,
        errorMessage: `Expected valid TimingDistribution object, got ${JSON.stringify(v)}`,
      };
    }

    // Check that durations are valid
    const nonNumericKey = (v as number[]).find((key) => isNaN(+key));
    if (nonNumericKey) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidValue,
        errorMessage: `Expected all durations to be numbers, got ${nonNumericKey}`,
      };
    }

    const negativeDuration = (v as number[]).find((key) => !isNaN(+key) && +key < 0);
    if (negativeDuration) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidValue,
        errorMessage: `Expected all durations to be greater than 0, got ${negativeDuration}`,
      };
    }

    return { type: MetricValidation.Success };
  }

  payload(): TimingDistributionPayloadRepresentation {
    const hist = constructFunctionalHistogramFromValues(this._inner as number[]);
    return {
      values: hist.values,
      sum: hist.sum,
    };
  }
}

class InternalTimingDistributionMetricType extends MetricType {
  private timeUnit: string;
  private startTimes: Record<TimerId, number>;

  constructor(meta: CommonMetricData, timeUnit: string) {
    super("timing_distribution", meta, TimingDistributionMetric);

    this.timeUnit = timeUnit as TimeUnit;
    this.startTimes = {};
  }

  start(): TimerId {
    const startTime = getCurrentTimeInNanoSeconds();
    const id: TimerId = Context.getNextTimingDistributionId();

    this.setStart(id, startTime);
    return id;
  }

  /**
   * **Test-only API**
   *
   * Set start time for this metric.
   *
   * @param id Current timer's ID
   * @param startTime Start time fo the current timer
   */
  setStart(id: TimerId, startTime: number) {
    Context.dispatcher.launch(async () => {
      // Per Glean book
      // "If the Glean upload is disabled when calling start, the timer is still started"
      // (https://mozilla.github.io/glean/book/reference/metrics/timing_distribution.html)
      this.startTimes[id] = startTime;

      return Promise.resolve();
    });
  }

  stopAndAccumulate(id: TimerId) {
    const stopTime = getCurrentTimeInNanoSeconds();
    this.setStopAndAccumulate(id, stopTime);
  }

  setStopAndAccumulate(id: TimerId, stopTime: number) {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        delete this.startTimes[id];
        return;
      }

      // Duration is in nanoseconds.
      let duration;

      const startTime = this.startTimes[id];
      if (startTime !== undefined) {
        delete this.startTimes[id];
      } else {
        await Context.errorManager.record(this, ErrorType.InvalidState, "Timing not running");
        return;
      }

      duration = stopTime - startTime;

      if (duration < 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidValue,
          "Timer stopped with negative duration"
        );
        return;
      }

      const minSampleTime = convertTimeUnitToNanos(1, this.timeUnit as TimeUnit);
      const maxSampleTime = convertTimeUnitToNanos(MAX_SAMPLE_TIME, this.timeUnit as TimeUnit);

      if (duration < minSampleTime) {
        // If measurement is less than the minimum, just truncate. This is
        // not recorded as an error.
        duration = minSampleTime;
      } else if (duration > maxSampleTime) {
        await Context.errorManager
          .record(
            this,
            ErrorType.InvalidState,
            `Sample is longer than the max for a timeUnit of ${this.timeUnit} (${duration} ns)`
          )
          .catch();
        duration = maxSampleTime;
      } else {
        // do nothing, we have a valid duration
      }

      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      try {
        const transformFn = ((duration: number) => {
          return (old?: JSONValue): TimingDistributionMetric => {
            const values = this.extractDurationValuesFromJsonValue(old);
            return new TimingDistributionMetric([...values, duration]);
          };
        })(duration);

        await Context.metricsDatabase.transform(this, transformFn);
      } catch (e) {
        if (e instanceof MetricValidationError) {
          await e.recordError(this);
        }
      }
      return Promise.resolve();
    });
  }

  cancel(id: TimerId) {
    delete this.startTimes[id];
  }

  accumulateSamples(samples: number[]) {
    this.setAccumulateSamples(samples);
  }

  setAccumulateSamples(samples: number[]) {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      let numNegativeSamples = 0;
      let numTooLongSamples = 0;
      const maxSampleTime = convertTimeUnitToNanos(MAX_SAMPLE_TIME, this.timeUnit as TimeUnit);

      const transformFn = ((samples: number[]) => {
        return (old?: JSONValue): TimingDistributionMetric => {
          const values = this.extractDurationValuesFromJsonValue(old);

          const convertedSamples: number[] = [];
          samples.forEach((sample) => {
            if (sample < 0) {
              numNegativeSamples++;
            } else {
              // Check the range prior to converting the incoming unit to
              // nanoseconds, so we can compare against the constant
              // MAX_SAMPLE_TIME.
              if (sample === 0) {
                sample = 1;
              } else if (sample > maxSampleTime) {
                numTooLongSamples++;
                sample = maxSampleTime;
              }

              sample = convertTimeUnitToNanos(sample, this.timeUnit as TimeUnit);
              convertedSamples.push(sample);
            }
          });

          return new TimingDistributionMetric([...values, ...convertedSamples]);
        };
      })(samples);

      await Context.metricsDatabase.transform(this, transformFn);

      if (numNegativeSamples > 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidOverflow,
          `Accumulated ${numNegativeSamples} negative samples`,
          numNegativeSamples
        );
      }

      if (numTooLongSamples > 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidOverflow,
          `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`,
          numTooLongSamples
        );
      }
    });
  }

  accumulateRawSamplesNanos(samples: number[]) {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      let numTooLongSamples = 0;
      const minSampleTime = convertTimeUnitToNanos(1, this.timeUnit as TimeUnit);
      const maxSampleTime = convertTimeUnitToNanos(MAX_SAMPLE_TIME, this.timeUnit as TimeUnit);

      const transformFn = ((samples: number[]) => {
        return (old?: JSONValue): TimingDistributionMetric => {
          const values = this.extractDurationValuesFromJsonValue(old);

          const convertedSamples: number[] = [];
          samples.forEach((sample) => {
            if (sample < minSampleTime) {
              sample = minSampleTime;
            } else if (sample > maxSampleTime) {
              numTooLongSamples++;
              sample = maxSampleTime;
            }

            // `sample` is already in nanoseconds
            convertedSamples.push(sample);
          });

          return new TimingDistributionMetric([...values, ...convertedSamples]);
        };
      })(samples);

      await Context.metricsDatabase.transform(this, transformFn);

      if (numTooLongSamples > 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidOverflow,
          `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`,
          numTooLongSamples
        );
      }
    });
  }

  async testGetValue(ping: string = this.sendInPings[0]): Promise<DistributionData | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let value: TimingDistributionInternalRepresentation | undefined;
      await Context.dispatcher.testLaunch(async () => {
        value = await Context.metricsDatabase.getMetric(ping, this);
      });

      if (value) {
        return snapshot(constructFunctionalHistogramFromValues(value));
      }
    }
  }

  async testGetNumRecordedErrors(
    errorType: string,
    ping: string = this.sendInPings[0]
  ): Promise<number> {
    if (testOnlyCheck("testGetNumRecordedErrors")) {
      return Context.errorManager.testGetNumRecordedErrors(this, errorType as ErrorType, ping);
    }

    return 0;
  }

  /**
   * Takes the previous values and casts as a `number[]` or creates a new empty `number[]`. We store
   * previous durations as an array of values so that we can always reconstruct our histogram. We
   * are unable to store complex objects in Glean as they must be JSON parse-able objects.
   *
   * @param jsonValue Will always be either undefined or a `number[]`.
   * @returns An array of previous durations or an empty array if nothing was previously stored.
   */
  private extractDurationValuesFromJsonValue(jsonValue?: JSONValue): number[] {
    let values: number[];
    if (jsonValue) {
      values = jsonValue as number[];
    } else {
      values = [];
    }

    return values;
  }
}

/**
 * A timing distribution metric.
 *
 * Timing distributions are used to accumulate and store time measurement, for
 * analyzing distributions of the timing data.
 */
export default class {
  #inner: InternalTimingDistributionMetricType;

  constructor(meta: CommonMetricData, timeUnit: string) {
    this.#inner = new InternalTimingDistributionMetricType(meta, timeUnit as TimeUnit);
  }

  /**
   * Starts tracking time for the provided metric. Multiple timers can run simultaneously.
   *
   * This records an error if it's already tracking time (i.e.
   * `start` was already called with no corresponding `stopAndAccumulate`):
   * in that case the original start time will be preserved.
   *
   * @returns The ID to associate with this timing.
   */
  start(): TimerId {
    const id = this.#inner.start();
    return id;
  }

  /**
   * Test-only API
   *
   * Set start time for this metric.
   *
   * @param id Current timer's ID
   * @param startTime Start time fo the current timer
   */
  setStart(id: TimerId, startTime: number) {
    this.#inner.setStart(id, startTime);
  }

  /**
   * Stop tracking time for the provided metric and associated timer id. Add a
   * count to the corresponding bucket in the timing distribution.
   * This will record an error if no `start` was called.
   *
   * @param id The timer id associated with this timing. This allows for
   *        concurrent timing of events associated with different ids to
   *        the same timespan metric.
   */
  stopAndAccumulate(id: TimerId): void {
    this.#inner.stopAndAccumulate(id);
  }

  /**
   * **Test-only API**
   *
   * Set stop time for the metric.
   *
   * Use `stopAndAccumulate` instead.
   *
   * @param id Timer ID to stop
   * @param stopTime End time for the current timer
   */
  setStopAndAccumulate(id: TimerId, stopTime: number) {
    this.#inner.setStopAndAccumulate(id, stopTime);
  }

  /**
   * Accumulates the provided samples in the metric.
   *
   * **Notes**
   * Reports an `ErrorType.InvalidOverflow` error for samples that are
   * longer than `MAX_SAMPLE_TIME`.
   *
   * @param samples A list of samples recorded by the metric. Samples must be in nanoseconds.
   */
  accumulateRawSamplesNanos(samples: number[]): void {
    this.#inner.accumulateRawSamplesNanos(samples);
  }

  /**
   * Accumulates the provided signed samples in the metric.
   *
   * This will take care of filtering and reporting errors for any provided
   * negative sample.
   *
   * Please note that this assumes that the provided samples are already in
   * the "unit" declared by the instance of the metric type (e.g. if the instance
   * this method was called on is using `TimeUnit.Second`, then `samples` are
   * assumed to be in that unit).
   *
   * Discards any negative value in `samples` and reports an `ErrorType.InvalidValue`
   * for each of them. Reports an `ErrorType.InvalidOverflow` error for samples that
   * are longer than `MAX_SAMPLE_TIME`.
   *
   * @param samples Holds all the samples for the recorded metric.
   */
  accumulateSamples(samples: number[]): void {
    this.#inner.accumulateSamples(samples);
  }

  /**
   * **Test-only API**
   *
   * Accumulates the provided signed samples in the metric.
   *
   * Use `accumulateSamples` instead.
   *
   * @param samples Signed samples to accumulate in metric.
   */
  setAccumulateSamples(samples: number[]): void {
    this.#inner.setAccumulateSamples(samples);
  }

  /**
   * Aborts a previous `start` call.
   *
   * No error is recorded if no `start` was called.
   *
   * @param id The `TimerId` to associate with this timing. This allows
   * for concurrent timing of events associated with different IDs to the
   * same timing distribution metric.
   */
  cancel(id: TimerId): void {
    this.#inner.cancel(id);
  }

  /**
   * Test-only API
   *
   * @param ping The ping from which we want to retrieve the metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(
    ping: string = this.#inner.sendInPings[0]
  ): Promise<DistributionData | undefined> {
    return this.#inner.testGetValue(ping);
  }

  /**
   * Test-only API
   *
   * Returns the number of errors recorded for the given metric.
   *
   * @param errorType The type of the error recorded.
   * @param ping Represents the name of the ping to retrieve the metric for.
   *        Defaults to the first value in `sendInPings`.
   * @returns The number of errors recorded for the metric.
   */
  async testGetNumRecordedErrors(
    errorType: string,
    ping: string = this.#inner.sendInPings[0]
  ): Promise<number> {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}
