import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric";
import type { DistributionData } from "../distributions.js";
import { Metric } from "../metric.js";
declare type TimingDistributionInternalRepresentation = number[];
export declare type TimingDistributionPayloadRepresentation = {
    values: Record<number, number>;
    sum: number;
};
export declare class TimingDistributionMetric extends Metric<TimingDistributionInternalRepresentation, TimingDistributionPayloadRepresentation> {
    constructor(v: unknown);
    get timingDistribution(): Record<number, number>;
    validate(v: unknown): MetricValidationResult;
    payload(): TimingDistributionPayloadRepresentation;
}
/**
 * A timing distribution metric.
 *
 * Timing distributions are used to accumulate and store time measurement, for
 * analyzing distributions of the timing data.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData, timeUnit: string);
    /**
     * Starts tracking time for the provided metric. Multiple timers can run simultaneously.
     *
     * This records an error if it's already tracking time (i.e.
     * `start` was already called with no corresponding `stopAndAccumulate`):
     * in that case the original start time will be preserved.
     *
     * @returns The ID to associate with this timing.
     */
    start(): number;
    /**
     * Test-only API
     *
     * Set start time for this metric.
     *
     * @param id Current timer's ID
     * @param startTime Start time fo the current timer
     */
    setStart(id: number, startTime: number): void;
    /**
     * Stop tracking time for the provided metric and associated timer id. Add a
     * count to the corresponding bucket in the timing distribution.
     * This will record an error if no `start` was called.
     *
     * @param id The timer id associated with this timing. This allows for
     *        concurrent timing of events associated with different ids to
     *        the same timespan metric.
     */
    stopAndAccumulate(id: number): void;
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
    setStopAndAccumulate(id: number, stopTime: number): void;
    /**
     * Accumulates the provided samples in the metric.
     *
     * **Notes**
     * Reports an `ErrorType.InvalidOverflow` error for samples that are
     * longer than `MAX_SAMPLE_TIME`.
     *
     * @param samples A list of samples recorded by the metric. Samples must be in nanoseconds.
     */
    accumulateRawSamplesNanos(samples: number[]): void;
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
    accumulateSamples(samples: number[]): void;
    /**
     * **Test-only API**
     *
     * Accumulates the provided signed samples in the metric.
     *
     * Use `accumulateSamples` instead.
     *
     * @param samples Signed samples to accumulate in metric.
     */
    setAccumulateSamples(samples: number[]): void;
    /**
     * Aborts a previous `start` call.
     *
     * No error is recorded if no `start` was called.
     *
     * @param id The timer ID to associate with this timing. This allows
     * for concurrent timing of events associated with different IDs to the
     * same timing distribution metric.
     */
    cancel(id: number): void;
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
