import type { JSONValue } from "../utils.js";
import type { MetricType } from "./index.js";
import { ErrorType } from "../error/error_type.js";
export declare enum MetricValidation {
    Success = 0,
    Error = 1
}
export declare type MetricValidationResult = {
    type: MetricValidation.Success;
} | {
    type: MetricValidation.Error;
    errorMessage: string;
    errorType?: ErrorType;
};
export declare class MetricValidationError extends Error {
    readonly type: ErrorType;
    constructor(message?: string, type?: ErrorType);
    recordError(metric: MetricType): Promise<void>;
    recordErrorSync(metric: MetricType): void;
}
/**
 * The Metric class describes the shared behaviour amongst concrete metrics.
 *
 * A concrete metric will always have two possible representations:
 *
 * - `InternalRepresentation`
 *    - Is the format in which this metric will be stored in memory.
 *    - This format may contain extra metadata, in order to allow deserializing of this data for testing purposes.
 * - `PayloadRepresentation`
 *    - Is the format in which this metric will be represented in the ping payload.
 *    - This format must be the exact same as described in [the Glean schema](https://github.com/mozilla-services/mozilla-pipeline-schemas/blob/master/schemas/glean/glean/glean.1.schema.json).
 */
export declare abstract class Metric<InternalRepresentation extends JSONValue, PayloadRepresentation extends JSONValue> {
    protected inner: InternalRepresentation;
    constructor(v: unknown);
    /**
     * Gets this metrics value in its internal representation.
     *
     * @returns The metric value.
     */
    get(): InternalRepresentation;
    /**
     * Sets this metrics value.
     *
     * @param v The value to set.
     */
    set(v: InternalRepresentation): void;
    /**
     * Validates a given value using the validation function and throws in case it is not valid.
     *
     * @param v The value to verify.
     * @returns `v` if it is valid.
     */
    validateOrThrow(v: unknown): InternalRepresentation;
    /**
     * Validates that a given value is in the correct format for this metrics internal representation.
     *
     * # Note
     *
     * This function should only check for validations
     * that would prevent a metric from being recorded.
     *
     * @param v The value to verify.
     * @returns Whether or not validation was successful.
     */
    abstract validate(v: unknown): MetricValidationResult;
    /**
     * Gets this metrics value in its payload representation.
     *
     * @returns The metric value.
     */
    abstract payload(): PayloadRepresentation;
}
