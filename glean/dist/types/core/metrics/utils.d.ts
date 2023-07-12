import type { Metric, MetricValidationResult } from "./metric.js";
import type { JSONValue } from "../utils.js";
/**
 * A metric factory function.
 *
 * @param type The type of the metric to create.
 * @param v The value with which to instantiate the metric.
 * @returns A metric instance.
 * @throws
 * - In case type is not listed in the `Context.supportedMetrics`;
 * - In case `v` is not in the correct representation for the wanted metric type.
 */
export declare function createMetric(type: string, v: unknown): Metric<JSONValue, JSONValue>;
/**
 * Validates that a given value is in the correct
 * internal representation format for a metric of a given type.
 *
 * @param type The type of the metric to validate
 * @param v The value to verify
 * @returns Whether or not `v` is of the correct type.
 */
export declare function validateMetricInternalRepresentation<T extends JSONValue>(type: string, v: unknown): v is T;
/**
 * Validates that a given value is a positive integer.
 *
 * @param v The value to validate
 * @param zeroIsValid Whether or not to consider 0 a valid value, defaults to `true`
 * @returns A validation result
 */
export declare function validatePositiveInteger(v: unknown, zeroIsValid?: boolean): MetricValidationResult;
/**
 * Validates that a given value is a string.
 *
 * @param v The value to validate
 * @returns A validation result
 */
export declare function validateString(v: unknown): MetricValidationResult;
