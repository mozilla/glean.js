import type { DistributionData } from "../distributions.js";
import type { MetricValidationResult } from "../metric.js";
import type { CommonMetricData } from "../index.js";
import { Metric } from "../metric.js";
declare type MemoryDistributionInternalRepresentation = number[];
export declare type MemoryDistributionPayloadRepresentation = {
    values: Record<number, number>;
    sum: number;
};
export declare class MemoryDistributionMetric extends Metric<MemoryDistributionInternalRepresentation, MemoryDistributionPayloadRepresentation> {
    constructor(v: unknown);
    get memoryDistribution(): Record<number, number>;
    validate(v: unknown): MetricValidationResult;
    payload(): MemoryDistributionPayloadRepresentation;
}
/**
 * A memory distribution metric.
 *
 * Memory distributions are used to accumulate and store memory sizes.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData, memoryUnit: string);
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
    accumulate(sample: number): void;
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
    accumulateSamples(samples: number[]): void;
    /**
     * Test-only API
     *
     * @param ping The ping from which we want to retrieve the metrics value from.
     *        Defaults to the first value in `sendInPings`.
     * @returns The value found in storage or `undefined` if nothing was found.
     */
    testGetValue(ping?: string): Promise<DistributionData | undefined>;
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
    testGetNumRecordedErrors(errorType: string, ping?: string): Promise<number>;
}
export {};
