import { GLEAN_RESERVED_EXTRA_KEYS } from "../../constants.js";
import { isBoolean, isNumber, isString, isInteger, isObject } from "../../utils.js";
import { MetricValidation, Metric } from "../metric.js";
import { validateString } from "../utils.js";
export class RecordedEvent extends Metric {
    constructor(v) {
        super(v);
    }
    static withTransformedExtras(e, transformFn) {
        const extras = e.extra || {};
        const transformedExtras = transformFn(extras);
        return {
            category: e.category,
            name: e.name,
            timestamp: e.timestamp,
            extra: (transformedExtras && Object.keys(transformedExtras).length > 0)
                ? transformedExtras : undefined
        };
    }
    addExtra(key, value) {
        if (!this.inner.extra) {
            this.inner.extra = {};
        }
        this.inner.extra[key] = value;
    }
    withoutReservedExtras() {
        return RecordedEvent.withTransformedExtras(this.get(), (extras) => {
            return Object.keys(extras)
                .filter(key => !GLEAN_RESERVED_EXTRA_KEYS.includes(key))
                .reduce((obj, key) => {
                obj[key] = extras[key];
                return obj;
            }, {});
        });
    }
    validate(v) {
        if (!isObject(v)) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Expected Glean event object, got ${typeof v}`
            };
        }
        const categoryValidation = "category" in v && isString(v.category);
        const nameValidation = "name" in v && isString(v.name);
        if (!categoryValidation || !nameValidation) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Unexpected value for "category" or "name" in event object: ${JSON.stringify(v)}`
            };
        }
        const timestampValidation = "timestamp" in v && isInteger(v.timestamp) && v.timestamp >= 0;
        if (!timestampValidation) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Event timestamp must be a positive integer, got ${JSON.stringify(v)}`
            };
        }
        if (v.extra) {
            if (!isObject(v.extra)) {
                return {
                    type: MetricValidation.Error,
                    errorMessage: `Expected Glean extras object, got ${typeof v}`
                };
            }
            for (const [key, value] of Object.entries(v.extra)) {
                const validation = validateString(key);
                if (validation.type === MetricValidation.Error) {
                    return validation;
                }
                if (!isString(value) && !isNumber(value) && !isBoolean(value)) {
                    return {
                        type: MetricValidation.Error,
                        errorMessage: `Unexpected value for extra key ${key}: ${JSON.stringify(value)}`
                    };
                }
            }
        }
        return { type: MetricValidation.Success };
    }
    payload() {
        return RecordedEvent.withTransformedExtras(this.withoutReservedExtras(), (extras) => {
            return Object.keys(extras)
                .reduce((extra, key) => {
                extra[key] = extras[key].toString();
                return extra;
            }, {});
        });
    }
}
