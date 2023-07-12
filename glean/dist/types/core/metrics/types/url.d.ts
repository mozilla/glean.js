import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import { Metric } from "../metric.js";
export declare class UrlMetric extends Metric<string, string> {
    constructor(v: unknown);
    /**
     * Validates that a given value is a valid URL metric value.
     *
     * 1. The URL must be a string.
     * 2. The URL must not be a data URL.
     * 3. Every URL must start with a valid scheme.
     *
     * Note: We explicitly do not validate if the URL is fully spec compliant,
     * the above validations are all that is done.
     *
     * @param v The value to validate.
     * @returns Whether or not v is a valid URL-like string.
     */
    validate(v: unknown): MetricValidationResult;
    payload(): string;
}
/**
 * A URL metric.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData);
    /**
     * Sets to a specified value.
     *
     * @param url the value to set.
     */
    set(url: string): void;
    /**
     * Sets to a specified URL value.
     *
     * @param url the value to set.
     */
    setUrl(url: URL): void;
    /**
     * Test-only API.**
     *
     * Gets the currently stored value as a string.
     *
     * # Note
     *
     * this function will return the unencoded URL for convenience.
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
