import { MetricValidation } from "./metric.js";
import { isInteger, isString } from "../utils.js";
import { LabeledMetric } from "./types/labeled.js";
import { Context } from "../context.js";
import { ErrorType } from "../error/error_type.js";
import log, { LoggingLevel } from "../log.js";
const LOG_TAG = "Glean.core.Metrics.utils";
export function createMetric(type, v) {
    if (type.startsWith("labeled_")) {
        Context.addSupportedMetric(type, LabeledMetric);
    }
    const ctor = Context.getSupportedMetric(type);
    if (!ctor) {
        throw new Error(`Unable to create metric of unknown type "${type}".`);
    }
    return new ctor(v);
}
export function validateMetricInternalRepresentation(type, v) {
    try {
        createMetric(type, v);
        return true;
    }
    catch (e) {
        log(LOG_TAG, e.message, LoggingLevel.Error);
        return false;
    }
}
export function validatePositiveInteger(v, zeroIsValid = true) {
    if (!isInteger(v)) {
        return {
            type: MetricValidation.Error,
            errorMessage: `Expected integer value, got ${JSON.stringify(v)}`
        };
    }
    const validation = zeroIsValid ? v < 0 : v <= 0;
    if (validation) {
        return {
            type: MetricValidation.Error,
            errorMessage: `Expected positive value, got ${JSON.stringify(v)}`,
            errorType: ErrorType.InvalidValue
        };
    }
    return { type: MetricValidation.Success };
}
export function validateString(v) {
    if (!isString(v)) {
        return {
            type: MetricValidation.Error,
            errorMessage: `Expected string value, got ${JSON.stringify(v)}`
        };
    }
    return { type: MetricValidation.Success };
}
