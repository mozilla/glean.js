import type { CommonMetricData, MetricType } from "../index.js";
import type CounterMetricType from "./counter.js";
import type BooleanMetricType from "./boolean.js";
import type StringMetricType from "./string.js";
import type { JSONValue } from "../../utils.js";
import type { MetricValidationResult } from "../metric.js";
import { Metric } from "../metric.js";
/**
 * This is an internal metric representation for labeled metrics.
 *
 * This can be used to instruct the validators to simply report
 * whatever is stored internally, without performing any specific
 * validation.
 */
export declare class LabeledMetric extends Metric<JSONValue, JSONValue> {
    constructor(v: unknown);
    validate(_v: unknown): MetricValidationResult;
    payload(): JSONValue;
}
export declare const OTHER_LABEL = "__other__";
/**
 * Combines a metric's base identifier and label.
 *
 * @param metricName the metric base identifier
 * @param label the label
 * @returns a string representing the complete metric id including the label.
 */
export declare function combineIdentifierAndLabel(metricName: string, label: string): string;
/**
 * Strips the label from a metric identifier.
 *
 * This is a no-op in case the identifier does not contain a label.
 *
 * @param identifier The identifier to strip a label from.
 * @returns The identifier without the label.
 */
export declare function stripLabel(identifier: string): string;
/**
 * Checks if the dynamic label stored in the metric data is
 * valid. If not, record an error and store data in the "__other__"
 * label.
 *
 * @param metric the metric to record to.
 * @returns a valid label that can be used to store data.
 */
export declare function getValidDynamicLabel(metric: MetricType): Promise<string>;
/**
 * Checks if the dynamic label stored in the metric data is
 * valid. If not, record an error and store data in the "__other__"
 * label.
 *
 * @param metric the metric to record to.
 * @returns a valid label that can be used to store data.
 */
export declare function getValidDynamicLabelSync(metric: MetricType): string;
declare type SupportedLabeledTypes = CounterMetricType | BooleanMetricType | StringMetricType;
declare class LabeledMetricType<T extends SupportedLabeledTypes> {
    [label: string]: T;
    constructor(meta: CommonMetricData, submetric: new (...args: any) => T, labels?: string[]);
    /**
     * Create an instance of the submetric type for the provided static label.
     *
     * @param meta the `CommonMetricData` information for the metric.
     * @param submetricClass the class type for the submetric.
     * @param allowedLabels the array of allowed labels.
     * @param label the desired label to record to.
     * @returns an instance of the submetric class type that allows to record data.
     */
    private static createFromStaticLabel;
    /**
     * Create an instance of the submetric type for the provided dynamic label.
     *
     * @param meta the `CommonMetricData` information for the metric.
     * @param submetricClass the class type for the submetric.
     * @param label the desired label to record to.
     * @returns an instance of the submetric class type that allows to record data.
     */
    private static createFromDynamicLabel;
}
export default LabeledMetricType;
