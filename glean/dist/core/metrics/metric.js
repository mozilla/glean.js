import { Context } from "../context.js";
import { ErrorType } from "../error/error_type.js";
export var MetricValidation;
(function (MetricValidation) {
    MetricValidation[MetricValidation["Success"] = 0] = "Success";
    MetricValidation[MetricValidation["Error"] = 1] = "Error";
})(MetricValidation || (MetricValidation = {}));
export class MetricValidationError extends Error {
    constructor(message, type = ErrorType.InvalidType) {
        super(message);
        this.type = type;
        try {
            this.name = "MetricValidationError";
        }
        catch (_a) {
        }
    }
    async recordError(metric) {
        await Context.errorManager.record(metric, this.type, this.message);
    }
    recordErrorSync(metric) {
        Context.errorManager.record(metric, this.type, this.message);
    }
}
export class Metric {
    constructor(v) {
        this.inner = this.validateOrThrow(v);
    }
    get() {
        return this.inner;
    }
    set(v) {
        this.inner = v;
    }
    validateOrThrow(v) {
        const validation = this.validate(v);
        if (validation.type === MetricValidation.Error) {
            throw new MetricValidationError(validation.errorMessage, validation.errorType);
        }
        return v;
    }
}
