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
import { saturatingAdd, isUndefined, testOnlyCheck } from "../../utils.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { Metric, MetricValidationError } from "../metric.js";
import log from "../../log.js";
import { validatePositiveInteger } from "../utils.js";
const LOG_TAG = "core.metrics.CounterMetricType";
export class CounterMetric extends Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        return validatePositiveInteger(v, false);
    }
    payload() {
        return this.inner;
    }
    saturatingAdd(amount) {
        const correctAmount = this.validateOrThrow(amount);
        this.inner = saturatingAdd(this.inner, correctAmount);
    }
}
export class InternalCounterMetricType extends MetricType {
    constructor(meta) {
        super("counter", meta, CounterMetric);
    }
    add(amount) {
        if (Context.isPlatformSync()) {
            this.addSync(amount);
        }
        else {
            this.addAsync(amount);
        }
    }
    transformFn(amount) {
        return (v) => {
            const metric = new CounterMetric(amount);
            if (v) {
                try {
                    metric.saturatingAdd(v);
                }
                catch (_a) {
                    log(LOG_TAG, `Unexpected value found in storage for metric ${this.name}: ${JSON.stringify(v)}. Overwriting.`);
                }
            }
            return metric;
        };
    }
    addAsync(amount) {
        Context.dispatcher.launch(async () => this.addUndispatched(amount));
    }
    async addUndispatched(amount) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        if (isUndefined(amount)) {
            amount = 1;
        }
        try {
            await Context.metricsDatabase.transform(this, this.transformFn(amount));
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                await e.recordError(this);
            }
        }
    }
    addSync(amount) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        if (isUndefined(amount)) {
            amount = 1;
        }
        try {
            Context.metricsDatabase.transform(this, this.transformFn(amount));
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
        __classPrivateFieldSet(this, _inner, new InternalCounterMetricType(meta), "f");
    }
    add(amount) {
        __classPrivateFieldGet(this, _inner, "f").add(amount);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_inner = new WeakMap();
