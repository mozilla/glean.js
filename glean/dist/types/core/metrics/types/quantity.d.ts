import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import { Metric } from "../metric.js";
export declare class QuantityMetric extends Metric<number, number> {
    constructor(v: unknown);
    validate(v: unknown): MetricValidationResult;
    payload(): number;
}
/**
 * A quantity metric.
 *
 * Used to store quantity.
 * The value can only be non-negative.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData);
    /**
     * Sets to the specified quantity value.
     * Logs an warning if the value is negative.
     *
     * @param value the value to set. Must be non-negative
     */
    set(value: number): void;
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
