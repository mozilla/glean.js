import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import { MetricType } from "../index.js";
import { Metric } from "../metric.js";
export declare class UUIDMetric extends Metric<string, string> {
    constructor(v: unknown);
    validate(v: unknown): MetricValidationResult;
    payload(): string;
}
/**
 * Base implementation of the UUID metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the UUID metric type.
 */
export declare class InternalUUIDMetricType extends MetricType {
    constructor(meta: CommonMetricData);
    set(value: string): void;
    generateAndSet(): string | undefined;
    setAsync(value: string): void;
    /**
     * An implementation of `set` that does not dispatch the recording task.
     *
     * # Important
     *
     * This method should **never** be exposed to users.
     *
     * @param value The UUID we want to set to.
     */
    setUndispatched(value: string): Promise<void>;
    setSync(value: string): void;
    testGetValue(ping?: string): Promise<string | undefined>;
}
/**
 *  An UUID metric.
 *
 * Stores UUID v4 (randomly generated) values.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData);
    /**
     * Sets to the specified value.
     *
     * @param value the value to set.
     * @throws In case `value` is not a valid UUID.
     */
    set(value: string): void;
    /**
     * Generates a new random uuid and sets the metric to it.
     *
     * @returns The generated value or `undefined` in case this
     *          metric shouldn't be recorded.
     */
    generateAndSet(): string | undefined;
    /**
     * Test-only API.**
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
