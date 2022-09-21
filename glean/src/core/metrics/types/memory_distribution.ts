/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { DistributionData } from "../distributions.js";
import type { MemoryUnit } from "../memory_unit.js";
import type { MetricValidationResult } from "../metric.js";
import type { CommonMetricData } from "../index.js";
import type { JSONValue } from "../../utils.js";

import { MetricType } from "../index.js";
import { Metric, MetricValidation, MetricValidationError } from "../metric.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";
import { isUndefined, testOnlyCheck } from "../../utils.js";
import { constructFunctionalHistogramFromValues } from "../../../histogram/functional.js";
import { extractAccumulatedValuesFromJsonValue, snapshot } from "../distributions.js";
import { convertMemoryUnitToBytes } from "../memory_unit.js";

const LOG_TAG = "core.metrics.MemoryDistributionMetricType";

// The base of the logarithm used to determine bucketing
const LOG_BASE = 2.0;

// The buckets per each order of magnitude of the logarithm.
const BUCKETS_PER_MAGNITUDE = 16.0;

// Set a maximum recordable value of 1 terabyte so the buckets aren't
// completely unbounded.
const MAX_BYTES = 2 ** 40;

type MemoryDistributionInternalRepresentation = number[];

export type MemoryDistributionPayloadRepresentation = {
  // A map containing the bucket index mapped to the accumulated count.
  //
  // This can contain buckets with a count of `0`.
  values: Record<number, number>;

  // The accumulated sum of all the samples in the distribution.
  sum: number;
};

export class MemoryDistributionMetric extends Metric<
  MemoryDistributionInternalRepresentation,
  MemoryDistributionPayloadRepresentation
> {
  constructor(v: unknown) {
    super(v);
  }

  get memoryDistribution(): Record<number, number> {
    return this._inner;
  }

  validate(v: unknown): MetricValidationResult {
    // Check that array is valid
    if (isUndefined(v) || !Array.isArray(v)) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidType,
        errorMessage: `Expected valid MemoryDistribution object, got ${JSON.stringify(v)}`,
      };
    }

    const negativeDuration = (v as number[]).find((key) => key < 0);
    if (negativeDuration) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidValue,
        errorMessage: `Expected all durations to be greater than 0, got ${negativeDuration}`,
      };
    }

    return { type: MetricValidation.Success };
  }

  payload(): MemoryDistributionPayloadRepresentation {
    const hist = constructFunctionalHistogramFromValues(
      this._inner as number[],
      LOG_BASE,
      BUCKETS_PER_MAGNITUDE
    );
    return {
      values: hist.values,
      sum: hist.sum,
    };
  }
}

class InternalMemoryDistributionMetricType extends MetricType {
  private memoryUnit: string;

  constructor(meta: CommonMetricData, memoryUnit: string) {
    super("memory_distribution", meta, MemoryDistributionMetric);

    this.memoryUnit = memoryUnit as MemoryUnit;
  }

  accumulate(sample: number): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      if (sample < 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidValue,
          "Accumulated a negative sample"
        );
        return;
      }

      let convertedSample = convertMemoryUnitToBytes(sample, this.memoryUnit as MemoryUnit);

      if (sample > MAX_BYTES) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidValue,
          "Sample is bigger than 1 terabyte."
        );
        convertedSample = MAX_BYTES;
      }

      try {
        const transformFn = ((sample: number) => {
          return (old?: JSONValue): MemoryDistributionMetric => {
            const values = extractAccumulatedValuesFromJsonValue(old);
            return new MemoryDistributionMetric([...values, sample]);
          };
        })(convertedSample);

        await Context.metricsDatabase.transform(this, transformFn);
      } catch (e) {
        if (e instanceof MetricValidationError) {
          await e.recordError(this);
        }
      }
    });
  }

  accumulateSamples(samples: number[]): void {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      let numNegativeSamples = 0;
      let numTooLongSamples = 0;

      const transformFn = ((samples: number[]) => {
        return (old?: JSONValue): MemoryDistributionMetric => {
          const values = extractAccumulatedValuesFromJsonValue(old);

          const convertedSamples: number[] = [];
          samples.forEach((sample) => {
            if (sample < 0) {
              numNegativeSamples++;
            } else {
              sample = convertMemoryUnitToBytes(sample, this.memoryUnit as MemoryUnit);
              if (sample > MAX_BYTES) {
                numTooLongSamples++;
                sample = MAX_BYTES;
              }

              convertedSamples.push(sample);
            }
          });

          return new MemoryDistributionMetric([...values, ...convertedSamples]);
        };
      })(samples);

      await Context.metricsDatabase.transform(this, transformFn);

      if (numNegativeSamples > 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidValue,
          `Accumulated ${numNegativeSamples} negative samples`,
          numNegativeSamples
        );
      }

      if (numTooLongSamples > 0) {
        await Context.errorManager.record(
          this,
          ErrorType.InvalidValue,
          `Accumulated ${numTooLongSamples} larger than 1TB`,
          numTooLongSamples
        );
      }
    });
  }

  async testGetValue(ping: string = this.sendInPings[0]): Promise<DistributionData | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let value: MemoryDistributionInternalRepresentation | undefined;
      await Context.dispatcher.testLaunch(async () => {
        value = await Context.metricsDatabase.getMetric(ping, this);
      });

      if (value) {
        return snapshot(
          constructFunctionalHistogramFromValues(value, LOG_BASE, BUCKETS_PER_MAGNITUDE)
        );
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
}

/**
 * A memory distribution metric.
 *
 * Memory distributions are used to accumulate and store memory sizes.
 */
export default class {
  #inner: InternalMemoryDistributionMetricType;

  constructor(meta: CommonMetricData, memoryUnit: string) {
    this.#inner = new InternalMemoryDistributionMetricType(meta, memoryUnit as MemoryUnit);
  }

  /**
   * Accumulates the provided sample in the metric.
   *
   * **Notes**
   * Values bigger than 1 Terabyte (2^40 bytes) are truncated and an `ErrorType.InvalidValue`
   * error is recorded.
   *
   * @param sample The sample to be recorded by the metric. The sample is assumed to be
   *        in the configured memory unit of the metric.
   */
  accumulate(sample: number): void {
    this.#inner.accumulate(sample);
  }

  /**
   * Accumulates the provided signed samples in the metric.
   *
   * This is required so that the platform-specific code can provide us with
   * 64 bit signed integers if no `u64` comparable type is available. This
   * will take care of filtering and reporting errors for any provided negative
   * sample.
   *
   * Please note that this assumes that the provided samples are already in
   * the "unit" declared by the instance of the metric type (e.g. if the the
   * instance this method was called on is using `MemoryUnit.Kilobyte`, then
   * `samples` are assumed to be in that unit).
   *
   * **Notes**
   * Discards any negative value in `samples` and reports an `ErrorType.InvalidValue`
   * for each of them.
   *
   * Values bigger than 1 Terabyte (2^40 bytes) are truncated and an
   * `ErrorType.InvalidValue` error is recorded.
   *
   * @param samples The array holding the samples to be recorded by the metric.
   */
  accumulateSamples(samples: number[]): void {
    this.#inner.accumulateSamples(samples);
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
