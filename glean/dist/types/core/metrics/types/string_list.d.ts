import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import { Metric } from "../metric.js";
export declare const MAX_LIST_LENGTH = 20;
export declare const MAX_STRING_LENGTH = 50;
export declare class StringListMetric extends Metric<string[], string[]> {
    constructor(v: unknown);
    validate(v: unknown): MetricValidationResult;
    concat(list: unknown): void;
    payload(): string[];
}
export default class {
    #private;
    constructor(meta: CommonMetricData);
    /**
     * Sets to the specified string list value.
     *
     * # Note
     *
     * Truncates the list if it is longer than `MAX_LIST_LENGTH` and records an error.
     *
     * Truncates the value if it is longer than `MAX_STRING_LENGTH` characters
     * and records an error.
     *
     * @param value The list of strings to set the metric to.
     */
    set(value: string[]): void;
    /**
     * Adds a new string `value` to the list.
     *
     * # Note
     *
     * - If the list is already of length `MAX_LIST_LENGTH`, record an error.
     * - Truncates the value if it is longer than `MAX_STRING_LENGTH` characters
     * and records an error.
     *
     * @param value The string to add.
     */
    add(value: string): void;
    /**
     * Test-only API
     *
     * Gets the currently stored value as a string array.
     *
     * This doesn't clear the stored value.
     *
     * @param ping the ping from which we want to retrieve this metrics value from.
     *        Defaults to the first value in `sendInPings`.
     * @returns The value found in storage or `undefined` if nothing was found.
     */
    testGetValue(ping?: string): Promise<string[] | undefined>;
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
