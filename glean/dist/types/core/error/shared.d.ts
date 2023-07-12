import type { MetricType } from "../metrics/index.js";
import type { ErrorType } from "./error_type.js";
import type { OptionalAsync } from "../types.js";
import { InternalCounterMetricType as CounterMetricType } from "../metrics/types/counter.js";
export interface IErrorManager {
    /**
     * Records an error into Glean.
     *
     * Errors are recorded as labeled counters in the `glean.error` category.
     *
     * @param metric The metric to record an error for.
     * @param error The error type to record.
     * @param message The message to log. This message is not sent with the ping.
     *        It does not need to include the metric id, as that is automatically
     *        prepended to the message.
     * @param numErrors The number of errors of the same type to report.
     */
    record(metric: MetricType, error: ErrorType, message: unknown, numErrors?: number): OptionalAsync<void>;
    /**
     * Gets the number of recorded errors for the given metric and error type.
     *
     * @param metric The metric to get the number of errors for.
     * @param error The error type to get count of.
     * @param ping The ping from which we want to retrieve the number of recorded errors.
     *        Defaults to the first value in `sendInPings`.
     * @returns The number of errors reported.
     */
    testGetNumRecordedErrors(metric: MetricType, error: ErrorType, ping?: string): Promise<number>;
}
/**
 * Create a log tag for a specific metric type.
 *
 * @param metric The metric type to create a tag for.
 * @returns The tag.
 */
export declare function createLogTag(metric: MetricType): string;
/**
 * For a given metric, get the metric in which to record errors.
 *
 * # Important
 *
 * Errors do not adhere to the usual "maximum label" restriction.
 *
 * @param metric The metric to record an error for.
 * @param error The error type to record.
 * @returns The metric to record to.
 */
export declare function getErrorMetricForMetric(metric: MetricType, error: ErrorType): CounterMetricType;
