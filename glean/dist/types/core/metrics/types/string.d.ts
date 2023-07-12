import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import { MetricType } from "../index.js";
import { Metric } from "../metric.js";
export declare const MAX_LENGTH_VALUE = 100;
export declare class StringMetric extends Metric<string, string> {
    constructor(v: unknown);
    validate(v: unknown): MetricValidationResult;
    payload(): string;
}
/**
 * Base implementation of the string metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the string metric type.
 */
export declare class InternalStringMetricType extends MetricType {
    constructor(meta: CommonMetricData);
    set(value: string): void;
    setAsync(value: string): void;
    /**
     * An implementation of `set` that does not dispatch the recording task.
     *
     * # Important
     *
     * This method should **never** be exposed to users.
     *
     * @param value The string we want to set to.
     */
    setUndispatched(value: string): Promise<void>;
    setSync(value: string): void;
    testGetValue(ping?: string): Promise<string | undefined>;
}
/**
 * A string metric.
 *
 * Record an Unicode string value with arbitrary content.
 * Strings are length-limited to `MAX_LENGTH_VALUE` bytes.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData);
    /**
     * Sets to the specified string value.
     *
     * # Note
     *
     * Truncates the value if it is longer than `MAX_STRING_LENGTH` bytes
     * and logs an error.
     *
     * @param value the value to set.
     */
    set(value: string): void;
    /**
     * Test-only API
     *
     * Gets the currently stored value as a string.
     *
     * This doesn't clear the stored value.
     *
     * @param ping the ping from which we want to retrieve this metrics value from.
     *        Defaults to the first value in `sendInPings`.
     * @returns The value found in storage or `undefined` if nothing was found.
     */
    testGetValue(ping?: string): Promise<string | undefined>;
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
