import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import TimeUnit from "../time_unit.js";
import { MetricType } from "../index.js";
import { Metric } from "../metric.js";
export declare type TimespanInternalRepresentation = {
    timeUnit: TimeUnit;
    timespan: number;
};
export declare type TimespanPayloadRepresentation = {
    time_unit: TimeUnit;
    value: number;
};
export declare class TimespanMetric extends Metric<TimespanInternalRepresentation, TimespanPayloadRepresentation> {
    constructor(v: unknown);
    get timespan(): number;
    validateTimespan(v: unknown): MetricValidationResult;
    validate(v: unknown): MetricValidationResult;
    payload(): TimespanPayloadRepresentation;
}
/**
 * Base implementation of the timespan metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the timespan metric type.
 */
export declare class InternalTimespanMetricType extends MetricType {
    private timeUnit;
    startTime?: number;
    constructor(meta: CommonMetricData, timeUnit: string);
    start(): void;
    stop(): void;
    cancel(): void;
    setRawNanos(elapsed: number): void;
    startAsync(): void;
    stopAsync(): void;
    cancelAsync(): void;
    setRawNanosAsync(elapsed: number): void;
    /**
     * An implementation of `setRaw` that does not dispatch the recording task.
     *
     * # Important
     *
     * This method should **never** be exposed to users.
     *
     * @param elapsed The elapsed time to record, in milliseconds.
     */
    setRawUndispatched(elapsed: number): Promise<void>;
    setRawAsync(elapsed: number): Promise<void>;
    startSync(): void;
    stopSync(): void;
    cancelSync(): void;
    setRawNanosSync(elapsed: number): void;
    setRawSync(elapsed: number): void;
    testGetValue(ping?: string): Promise<number | undefined>;
}
/**
 * A timespan metric.
 *
 * Timespans are used to make a measurement of how much time
 * is spent in a particular task.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData, timeUnit: string);
    /**
     * Starts tracking time for the provided metric.
     *
     * This records an error if it's already tracking time (i.e. start was
     * already called with no corresponding `stop()`. In which case the original
     * start time will be preserved.
     */
    start(): void;
    /**
     * Stops tracking time for the provided metric. Sets the metric to the elapsed time.
     *
     * This will record an error if no `start()` was called.
     */
    stop(): void;
    /**
     * Aborts a previous `start()` call.
     *
     * No error is recorded if no `start()` was called.
     */
    cancel(): void;
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
    setRawNanos(elapsed: number): void;
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
    testGetValue(ping?: string): Promise<number | undefined>;
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
    testGetNumRecordedErrors(errorType: string, ping?: string): Promise<number>;
}
