import { combineIdentifierAndLabel, stripLabel } from "../metrics/types/labeled.js";
import { InternalCounterMetricType as CounterMetricType } from "../metrics/types/counter.js";
export function createLogTag(metric) {
    const capitalizedType = metric.type.charAt(0).toUpperCase() + metric.type.slice(1);
    return `core.metrics.${capitalizedType}`;
}
export function getErrorMetricForMetric(metric, error) {
    const identifier = metric.baseIdentifier();
    const name = stripLabel(identifier);
    return new CounterMetricType({
        name: combineIdentifierAndLabel(error, name),
        category: "glean.error",
        lifetime: "ping",
        sendInPings: metric.sendInPings,
        disabled: false
    });
}
