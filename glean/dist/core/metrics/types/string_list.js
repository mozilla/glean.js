var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _inner;
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric, MetricValidation, MetricValidationError } from "../metric.js";
import { testOnlyCheck, truncateStringAtBoundaryWithError, truncateStringAtBoundaryWithErrorSync } from "../../utils.js";
import { ErrorType } from "../../error/error_type.js";
import log from "../../log.js";
import { validateString } from "../utils.js";
const LOG_TAG = "core.metrics.StringListMetricType";
export const MAX_LIST_LENGTH = 20;
export const MAX_STRING_LENGTH = 50;
export class StringListMetric extends Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        if (!Array.isArray(v)) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Expected array, got ${JSON.stringify(v)}`
            };
        }
        for (const s of v) {
            const validation = validateString(s);
            if (validation.type === MetricValidation.Error) {
                return validation;
            }
        }
        return { type: MetricValidation.Success };
    }
    concat(list) {
        const correctedList = this.validateOrThrow(list);
        const result = [...this.inner, ...correctedList];
        if (result.length > MAX_LIST_LENGTH) {
            throw new MetricValidationError(`String list length of ${result.length} would exceed maximum of ${MAX_LIST_LENGTH}.`, ErrorType.InvalidValue);
        }
        this.inner = result;
    }
    payload() {
        return this.inner;
    }
}
class InternalStringListMetricType extends MetricType {
    constructor(meta) {
        super("string_list", meta, StringListMetric);
    }
    set(value) {
        if (Context.isPlatformSync()) {
            this.setSync(value);
        }
        else {
            this.setAsync(value);
        }
    }
    add(value) {
        if (Context.isPlatformSync()) {
            this.addSync(value);
        }
        else {
            this.addAsync(value);
        }
    }
    addTransformFn(value) {
        return (v) => {
            const metric = new StringListMetric([value]);
            try {
                v && metric.concat(v);
            }
            catch (e) {
                if (e instanceof MetricValidationError && e.type !== ErrorType.InvalidType) {
                    throw e;
                }
                else {
                    log(LOG_TAG, `Unexpected value found in storage for metric ${this.name}: ${JSON.stringify(v)}. Overwriting.`);
                }
            }
            return metric;
        };
    }
    setAsync(value) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            try {
                if (value.length > MAX_LIST_LENGTH) {
                    await Context.errorManager.record(this, ErrorType.InvalidValue, `String list length of ${value.length} exceeds maximum of ${MAX_LIST_LENGTH}.`);
                }
                const metric = new StringListMetric(value);
                const truncatedList = [];
                for (let i = 0; i < Math.min(value.length, MAX_LIST_LENGTH); ++i) {
                    const truncatedString = await truncateStringAtBoundaryWithError(this, value[i], MAX_STRING_LENGTH);
                    truncatedList.push(truncatedString);
                }
                metric.set(truncatedList);
                await Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof MetricValidationError) {
                    await e.recordError(this);
                }
            }
        });
    }
    addAsync(value) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            try {
                const truncatedValue = await truncateStringAtBoundaryWithError(this, value, MAX_STRING_LENGTH);
                await Context.metricsDatabase.transform(this, this.addTransformFn(truncatedValue));
            }
            catch (e) {
                if (e instanceof MetricValidationError) {
                    await e.recordError(this);
                }
            }
        });
    }
    setSync(value) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        try {
            if (value.length > MAX_LIST_LENGTH) {
                Context.errorManager.record(this, ErrorType.InvalidValue, `String list length of ${value.length} exceeds maximum of ${MAX_LIST_LENGTH}.`);
            }
            const metric = new StringListMetric(value);
            const truncatedList = [];
            for (let i = 0; i < Math.min(value.length, MAX_LIST_LENGTH); ++i) {
                const truncatedString = truncateStringAtBoundaryWithErrorSync(this, value[i], MAX_STRING_LENGTH);
                truncatedList.push(truncatedString);
            }
            metric.set(truncatedList);
            Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    addSync(value) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        try {
            const truncatedValue = truncateStringAtBoundaryWithErrorSync(this, value, MAX_STRING_LENGTH);
            Context.metricsDatabase.transform(this, this.addTransformFn(truncatedValue));
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    async testGetValue(ping = this.sendInPings[0]) {
        if (testOnlyCheck("testGetValue", LOG_TAG)) {
            let metric;
            await Context.dispatcher.testLaunch(async () => {
                metric = await Context.metricsDatabase.getMetric(ping, this);
            });
            return metric;
        }
    }
}
export default class {
    constructor(meta) {
        _inner.set(this, void 0);
        __classPrivateFieldSet(this, _inner, new InternalStringListMetricType(meta), "f");
    }
    set(value) {
        __classPrivateFieldGet(this, _inner, "f").set(value);
    }
    add(value) {
        __classPrivateFieldGet(this, _inner, "f").add(value);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_inner = new WeakMap();
