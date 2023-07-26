import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import { Metric } from "../metric.js";
export declare type Rate = {
    numerator: number;
    denominator: number;
};
export declare class RateMetric extends Metric<Rate, Rate> {
    constructor(v: unknown);
    get numerator(): number;
    get denominator(): number;
    validate(v: unknown): MetricValidationResult;
    payload(): Rate;
}
export default class {
    #private;
    constructor(meta: CommonMetricData);
    /**
     * Increases the numerator by amount.
     *
     * # Note
     *
     * Records an `InvalidValue` error if the `amount` is negative.
     *
     * @param amount The amount to increase by. Should be non-negative.
     */
    addToNumerator(amount: number): void;
    /**
     * Increases the denominator by amount.
     *
     * # Note
     *
     * Records an `InvalidValue` error if the `amount` is negative.
     *
     * @param amount The amount to increase by. Should be non-negative.
     */
    addToDenominator(amount: number): void;
    /**
     * Test-only API.**
     *
     * Gets the currently stored value as an object.
     *
     * # Note
     *
     * This function will return the Rate for convenience.
     *
     * This doesn't clear the stored value.
     *
     * @param ping the ping from which we want to retrieve this metrics value from.
     *        Defaults to the first value in `sendInPings`.
     * @returns The value found in storage or `undefined` if nothing was found.
     */
    testGetValue(ping?: string): Promise<Rate | undefined>;
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
