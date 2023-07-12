import { Metric, MetricValidation } from "../metric.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";
export class LabeledMetric extends Metric {
    constructor(v) {
        super(v);
    }
    validate(_v) {
        return { type: MetricValidation.Success };
    }
    payload() {
        return this.inner;
    }
}
const MAX_LABELS = 16;
const MAX_LABEL_LENGTH = 61;
export const OTHER_LABEL = "__other__";
const LABEL_REGEX = /^[a-z_][a-z0-9_-]{0,29}(\.[a-z_][a-z0-9_-]{0,29})*$/;
export function combineIdentifierAndLabel(metricName, label) {
    return `${metricName}/${label}`;
}
export function stripLabel(identifier) {
    return identifier.split("/")[0];
}
export async function getValidDynamicLabel(metric) {
    if (metric.dynamicLabel === undefined) {
        throw new Error("This point should never be reached.");
    }
    const key = combineIdentifierAndLabel(metric.baseIdentifier(), metric.dynamicLabel);
    for (const ping of metric.sendInPings) {
        if (await Context.metricsDatabase.hasMetric(metric.lifetime, ping, metric.type, key)) {
            return key;
        }
    }
    let numUsedKeys = 0;
    for (const ping of metric.sendInPings) {
        numUsedKeys += await Context.metricsDatabase.countByBaseIdentifier(metric.lifetime, ping, metric.type, metric.baseIdentifier());
    }
    let hitError = false;
    if (numUsedKeys >= MAX_LABELS) {
        hitError = true;
    }
    else if (metric.dynamicLabel.length > MAX_LABEL_LENGTH) {
        hitError = true;
        await Context.errorManager.record(metric, ErrorType.InvalidLabel, `Label length ${metric.dynamicLabel.length} exceeds maximum of ${MAX_LABEL_LENGTH}.`);
    }
    else if (!LABEL_REGEX.test(metric.dynamicLabel)) {
        hitError = true;
        await Context.errorManager.record(metric, ErrorType.InvalidLabel, `Label must be snake_case, got '${metric.dynamicLabel}'.`);
    }
    return hitError ? combineIdentifierAndLabel(metric.baseIdentifier(), OTHER_LABEL) : key;
}
export function getValidDynamicLabelSync(metric) {
    if (metric.dynamicLabel === undefined) {
        throw new Error("This point should never be reached.");
    }
    const key = combineIdentifierAndLabel(metric.baseIdentifier(), metric.dynamicLabel);
    for (const ping of metric.sendInPings) {
        if (Context.metricsDatabase.hasMetric(metric.lifetime, ping, metric.type, key)) {
            return key;
        }
    }
    let numUsedKeys = 0;
    for (const ping of metric.sendInPings) {
        numUsedKeys += Context.metricsDatabase.countByBaseIdentifier(metric.lifetime, ping, metric.type, metric.baseIdentifier());
    }
    let hitError = false;
    if (numUsedKeys >= MAX_LABELS) {
        hitError = true;
    }
    else if (metric.dynamicLabel.length > MAX_LABEL_LENGTH) {
        hitError = true;
        Context.errorManager.record(metric, ErrorType.InvalidLabel, `Label length ${metric.dynamicLabel.length} exceeds maximum of ${MAX_LABEL_LENGTH}.`);
    }
    else if (!LABEL_REGEX.test(metric.dynamicLabel)) {
        hitError = true;
        Context.errorManager.record(metric, ErrorType.InvalidLabel, `Label must be snake_case, got '${metric.dynamicLabel}'.`);
    }
    return hitError ? combineIdentifierAndLabel(metric.baseIdentifier(), OTHER_LABEL) : key;
}
class LabeledMetricType {
    constructor(meta, submetric, labels) {
        return new Proxy(this, {
            get: (_target, label) => {
                if (labels) {
                    return LabeledMetricType.createFromStaticLabel(meta, submetric, labels, label);
                }
                return LabeledMetricType.createFromDynamicLabel(meta, submetric, label);
            }
        });
    }
    static createFromStaticLabel(meta, submetricClass, allowedLabels, label) {
        const adjustedLabel = allowedLabels.includes(label) ? label : OTHER_LABEL;
        const newMeta = {
            ...meta,
            name: combineIdentifierAndLabel(meta.name, adjustedLabel)
        };
        return new submetricClass(newMeta);
    }
    static createFromDynamicLabel(meta, submetricClass, label) {
        const newMeta = {
            ...meta,
            dynamicLabel: label
        };
        return new submetricClass(newMeta);
    }
}
export default LabeledMetricType;
