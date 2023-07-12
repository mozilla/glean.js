import { createMetric } from "../utils.js";
export const METRICS_DATABASE_LOG_TAG = "core.Metrics.Database";
const RESERVED_METRIC_NAME_PREFIX = "reserved#";
export const RESERVED_METRIC_IDENTIFIER_PREFIX = `glean.${RESERVED_METRIC_NAME_PREFIX}`;
export function generateReservedMetricIdentifiers(name) {
    return {
        category: "glean",
        name: `${RESERVED_METRIC_NAME_PREFIX}${name}`
    };
}
export function createMetricsPayload(v) {
    const result = {};
    for (const metricType in v) {
        const metrics = v[metricType];
        result[metricType] = {};
        for (const metricIdentifier in metrics) {
            const metric = createMetric(metricType, metrics[metricIdentifier]);
            result[metricType][metricIdentifier] = metric.payload();
        }
    }
    return result;
}
