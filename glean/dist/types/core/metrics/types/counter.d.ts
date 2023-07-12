import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import { MetricType } from "../index.js";
import { Metric } from "../metric.js";
export declare class CounterMetric extends Metric<number, number> {
    constructor(v: unknown);
    validate(v: unknown): MetricValidationResult;
    payload(): number;
    saturatingAdd(amount: unknown): void;
}
/**
 * Base implementation of the counter metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the counter metric type.
 */
export declare class InternalCounterMetricType extends MetricType {
    constructor(meta: CommonMetricData);
    add(amount?: number): void;
    private transformFn;
    addAsync(amount?: number): void;
    /**
     * An implementation of `add` that does not dispatch the recording task.
     *
     * # Important
     *
     * This method should **never** be exposed to users.
     *
     * @param amount The amount we want to add.
     */
    addUndispatched(amount?: number): Promise<void>;
    /**
     * A synchronous implementation of add.
     *
     * @param amount The amount we want to add.
     */
    addSync(amount?: number): void;
    testGetValue(ping?: string): Promise<number | undefined>;
}
/**
 * A counter metric.
 *
 * Used to count things.
 * The value can only be incremented, not decremented.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData);
    /**
     * Increases the counter by `amount`.
     *
     * # Note
     *
     * - Logs an error if the `amount` is 0 or negative.
     * - If the addition yields a number larger than Number.MAX_SAFE_INTEGER,
     *   Number.MAX_SAFE_INTEGER will be recorded.
     *
     * @param amount The amount to increase by. Should be positive.
     *               If not provided will default to `1`.
     */
    add(amount?: number): void;
    /**
     * Test-only API.
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
