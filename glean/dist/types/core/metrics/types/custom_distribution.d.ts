import type { CommonMetricData } from "../index.js";
import type { DistributionData } from "../distributions";
import type { MetricValidationResult } from "../metric.js";
import { Metric } from "../metric.js";
declare type CustomDistributionInternalRepresentation = {
    values: number[];
    rangeMin: number;
    rangeMax: number;
    bucketCount: number;
    histogramType: string;
};
export declare type CustomDistributionPayloadRepresentation = {
    values: Record<number, number>;
    sum: number;
};
export declare class CustomDistributionMetric extends Metric<CustomDistributionInternalRepresentation, CustomDistributionPayloadRepresentation> {
    constructor(v: unknown);
    get customDistribution(): CustomDistributionInternalRepresentation;
    validate(v: unknown): MetricValidationResult;
    payload(): CustomDistributionPayloadRepresentation;
}
/**
 * A custom distribution metric.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData, rangeMin: number, rangeMax: number, bucketCount: number, histogramType: string);
    /**
     * Accumulates the provided signed samples in the metric.
     *
     * ## Notes
     * Discards any negative value in `samples` and report an `ErrorType.InvalidValue`
     * for each of them.
     *
     * @param samples The vector holding the samples to be recorded by the metric.
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
