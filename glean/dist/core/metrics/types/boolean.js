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
import { MetricValidationError } from "../metric.js";
import { Metric, MetricValidation } from "../metric.js";
import { isBoolean, testOnlyCheck } from "../../utils.js";
const LOG_TAG = "core.metrics.BooleanMetricType";
export class BooleanMetric extends Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        if (!isBoolean(v)) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Expected boolean value, got ${JSON.stringify(v)}`
            };
        }
        else {
            return { type: MetricValidation.Success };
        }
    }
    payload() {
        return this.inner;
    }
}
class InternalBooleanMetricType extends MetricType {
    constructor(meta) {
        super("boolean", meta, BooleanMetric);
    }
    set(value) {
        if (Context.isPlatformSync()) {
            this.setSync(value);
        }
        else {
            this.setAsync(value);
        }
    }
    setAsync(value) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            try {
                const metric = new BooleanMetric(value);
                await Context.metricsDatabase.record(this, metric);
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
            const metric = new BooleanMetric(value);
            Context.metricsDatabase.record(this, metric);
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
        __classPrivateFieldSet(this, _inner, new InternalBooleanMetricType(meta), "f");
    }
    set(value) {
        __classPrivateFieldGet(this, _inner, "f").set(value);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_inner = new WeakMap();
