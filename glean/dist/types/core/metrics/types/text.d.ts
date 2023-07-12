import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import { Metric } from "../metric.js";
export declare const TEXT_MAX_LENGTH: number;
export declare class TextMetric extends Metric<string, string> {
    constructor(v: unknown);
    /**
     * Validates that a given value is within bounds.
     *
     * @param v The value to validate.
     * @returns Whether or not v is valid text data.
     */
    validate(v: unknown): MetricValidationResult;
    payload(): string;
}
/**
 * A text metric.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData);
    /**
     * Sets to a specified value.
     *
     * @param text the value to set.
     */
    set(text: string): void;
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
