import type { JSONValue } from "../utils.js";
import type { Lifetime } from "./lifetime.js";
import type { Metric } from "./metric.js";
export interface Metrics {
    [aMetricType: string]: {
        [aMetricIdentifier: string]: JSONValue;
    };
}
/**
 * The common set of data shared across all different metric types.
 */
export interface CommonMetricData {
    readonly name: string;
    readonly category: string;
    readonly sendInPings: string[];
    readonly lifetime: Lifetime | string;
    readonly disabled: boolean;
    dynamicLabel?: string;
}
/**
 * A MetricType describes common behavior across all metrics.
 */
export declare abstract class MetricType implements CommonMetricData {
    readonly type: string;
    readonly name: string;
    readonly category: string;
    readonly sendInPings: string[];
    readonly lifetime: Lifetime;
    readonly disabled: boolean;
    dynamicLabel?: string;
    constructor(type: string, meta: CommonMetricData, metricCtor?: new (v: unknown) => Metric<JSONValue, JSONValue>);
    /**
     * The metric's base identifier, including the category and name, but not the label.
     *
     * @returns The generated identifier. If `category` is empty, it's omitted. Otherwise,
     *          it's the combination of the metric's `category` and `name`.
     */
    baseIdentifier(): string;
    /**
     * The metric's unique identifier, including the category, name and label.
     *
     * @returns The generated identifier. If `category` is empty, it's omitted. Otherwise,
     *          it's the combination of the metric's `category`, `name` and `label`.
     */
    identifier(): Promise<string>;
    /**
     * The metric's unique identifier, including the category, name and label.
     *
     * @returns The generated identifier. If `category` is empty, it's omitted. Otherwise,
     *          it's the combination of the metric's `category`, `name` and `label`.
     */
    identifierSync(): string;
    /**
     * Verify whether or not this metric instance should be recorded.
     *
     * @param uploadEnabled Whether or not global upload is enabled or
     *        disabled.
     * @returns Whether or not this metric instance should be recorded.
     */
    shouldRecord(uploadEnabled: boolean): boolean;
    testGetNumRecordedErrors(errorType: string, ping?: string): Promise<number>;
}
