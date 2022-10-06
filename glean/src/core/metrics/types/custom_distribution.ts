/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { Histogram } from "../../../histogram/histogram";
import type { JSONValue } from "../../utils.js";
import type { DistributionData } from "../distributions";
import type { MetricValidationResult } from "../metric.js";

import { Context } from "../../context.js";
import { Metric, MetricValidation, MetricValidationError } from "../metric.js";
import { MetricType } from "../index.js";
import { ErrorType } from "../../error/error_type.js";
import { HistogramType } from "../../../histogram/histogram.js";
import { constructExponentialHistogramFromValues } from "../../../histogram/exponential.js";
import { constructLinearHistogramFromValues } from "../../../histogram/linear.js";
import { extractAccumulatedValuesFromJsonValue, snapshot } from "../distributions.js";
import { isUndefined, testOnlyCheck } from "../../utils.js";

const LOG_TAG = "core.metrics.CustomDistributionMetricType";

type CustomDistributionInternalRepresentation = {
  values: number[];
  rangeMin: number;
  rangeMax: number;
  bucketCount: number;
  histogramType: string;
};

export type CustomDistributionPayloadRepresentation = {
  // A map containing the bucket index mapped to the accumulated count.
  //
  // This can contain buckets with a count of `0`.
  values: Record<number, number>;

  // The accumulated sum of all the samples in the distribution.
  sum: number;
};

export class CustomDistributionMetric extends Metric<
  CustomDistributionInternalRepresentation,
  CustomDistributionPayloadRepresentation
> {
  constructor(v: unknown) {
    super(v);
  }

  get customDistribution(): CustomDistributionInternalRepresentation {
    return this._inner;
  }

  validate(v: unknown): MetricValidationResult {
    const obj = v as CustomDistributionInternalRepresentation;

    // Check that the object is valid.
    if (isUndefined(obj)) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidType,
        errorMessage: `Expected valid MemoryDistribution object, got ${JSON.stringify(obj)}`,
      };
    }

    // Check that the bucket count is greater than 0.
    if (isUndefined(obj.bucketCount) || obj.bucketCount < 0) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidValue,
        errorMessage: `Expected bucket count to be greater than 0, got ${obj.bucketCount}`,
      };
    }

    // Check that the rangeMin is greater than 0.
    if (isUndefined(obj.rangeMin) || obj.rangeMin < 0) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidValue,
        errorMessage: `Expected histogram rangeMin to be greater than 0, got ${obj.rangeMin}`,
      };
    }

    // Check that the rangeMax is greater than 0.
    if (isUndefined(obj.rangeMax) || obj.rangeMax < 0) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidValue,
        errorMessage: `Expected histogram rangeMax to be greater than 0, got ${obj.rangeMax}`,
      };
    }

    // Check that the histogram type is either Linear or Exponential.
    if (isUndefined(obj.histogramType) || !(obj.histogramType in HistogramType)) {
      return {
        type: MetricValidation.Error,
        errorType: ErrorType.InvalidValue,
        errorMessage: `Expected histogram type to be either Linear or Exponential, got ${obj.histogramType}`,
      };
    }

    return {
      type: MetricValidation.Success,
    };
  }

  payload(): CustomDistributionPayloadRepresentation {
    const { bucketCount, histogramType, rangeMax, rangeMin, values } = this._inner;
    const hist = constructHistogramByType(
      values,
      rangeMin,
      rangeMax,
      bucketCount,
      histogramType
      // It is safe to explicitly set the type here, it will never be undefined.
    ) as Histogram;
    return {
      sum: hist.sum,
      values: hist.values,
    };
  }
}

class InternalCustomDistributionMetricType extends MetricType {
  private rangeMin: number;
  private rangeMax: number;
  private bucketCount: number;
  private histogramType: string;

  constructor(
    meta: CommonMetricData,
    rangeMin: number,
    rangeMax: number,
    bucketCount: number,
    histogramType: string
  ) {
    super("custom_distribution", meta, CustomDistributionMetric);

    this.rangeMin = rangeMin;
    this.rangeMax = rangeMax;
    this.bucketCount = bucketCount;
    this.histogramType = histogramType;
  }

  accumulateSamples(samples: number[]) {
    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      let numNegativeSamples = 0;
      try {
        const transformFn = ((samples: number[]) => {
          return (old?: JSONValue): CustomDistributionMetric => {
            const values = extractAccumulatedValuesFromJsonValue(old);

            const convertedSamples: number[] = [];
            samples.forEach((sample) => {
              if (sample < 0) {
                numNegativeSamples++;
              } else {
                convertedSamples.push(sample);
              }
            });

            return new CustomDistributionMetric({
              values: [...values, ...convertedSamples],
              rangeMin: this.rangeMin,
              rangeMax: this.rangeMax,
              bucketCount: this.bucketCount,
              histogramType: this.histogramType,
            });
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
      } catch (e) {
        if (e instanceof MetricValidationError) {
          await e.recordError(this);
        }
      }
    });
  }

  async testGetValue(ping: string = this.sendInPings[0]): Promise<DistributionData | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let value: CustomDistributionInternalRepresentation | undefined;
      await Context.dispatcher.testLaunch(async () => {
        value = await Context.metricsDatabase.getMetric(ping, this);
      });

      if (value) {
        const { bucketCount, histogramType, rangeMax, rangeMin, values } = value;
        return snapshot(
          constructHistogramByType(
            values,
            rangeMin,
            rangeMax,
            bucketCount,
            histogramType
            // It is safe to explicitly set the type here, it will never be undefined.
          ) as Histogram
        );
      }
    }
  }
}

/**
 * A custom distribution metric.
 */
export default class {
  #inner: InternalCustomDistributionMetricType;

  constructor(
    meta: CommonMetricData,
    rangeMin: number,
    rangeMax: number,
    bucketCount: number,
    histogramType: string
  ) {
    this.#inner = new InternalCustomDistributionMetricType(
      meta,
      rangeMin,
      rangeMax,
      bucketCount,
      histogramType
    );
  }

  /**
   * Accumulates the provided signed samples in the metric.
   *
   * ## Notes
   * Discards any negative value in `samples` and report an `ErrorType.InvalidValue`
   * for each of them.
   *
   * @param samples The vector holding the samples to be recorded by the metric.
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

/**
 * Generate either a Linear or Exponential histogram based on the type.
 *
 * @param values The values to be used to construct the Histogram.
 * @param rangeMin The minimum number in the distribution.
 * @param rangeMax The maximum number in the distribution.
 * @param bucketCount The number of total buckets.
 * @param histogramType The type of histogram to generate.
 * @returns A Linear or Exponential histogram with accumulated values.
 */
function constructHistogramByType(
  values: number[],
  rangeMin: number,
  rangeMax: number,
  bucketCount: number,
  histogramType: string
) {
  switch (histogramType) {
  case HistogramType.exponential:
    return constructExponentialHistogramFromValues(values, rangeMin, rangeMax, bucketCount);
  case HistogramType.linear:
    return constructLinearHistogramFromValues(values, rangeMin, rangeMax, bucketCount);
  }
}
