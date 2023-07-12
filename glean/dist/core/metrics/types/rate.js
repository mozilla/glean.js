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
import { MetricValidationError, MetricValidation, Metric } from "../metric.js";
import { saturatingAdd, testOnlyCheck, isObject } from "../../utils.js";
import log from "../../log.js";
import { validatePositiveInteger } from "../utils.js";
const LOG_TAG = "core.metrics.RateMetricType";
export class RateMetric extends Metric {
    constructor(v) {
        super(v);
    }
    get numerator() {
        return this.inner.numerator;
    }
    get denominator() {
        return this.inner.denominator;
    }
    validate(v) {
        if (!isObject(v) || Object.keys(v).length !== 2) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Expected Glean rate metric object, got ${JSON.stringify(v)}`
            };
        }
        const numeratorVerification = validatePositiveInteger(v.numerator);
        if (numeratorVerification.type === MetricValidation.Error) {
            return numeratorVerification;
        }
        const denominatorVerification = validatePositiveInteger(v.denominator);
        if (denominatorVerification.type === MetricValidation.Error) {
            return denominatorVerification;
        }
        return { type: MetricValidation.Success };
    }
    payload() {
        return this.inner;
    }
}
class InternalRateMetricType extends MetricType {
    constructor(meta) {
        super("rate", meta, RateMetric);
    }
    addToNumerator(amount) {
        this.add({
            denominator: 0,
            numerator: amount
        });
    }
    addToDenominator(amount) {
        this.add({
            numerator: 0,
            denominator: amount
        });
    }
    add(value) {
        if (Context.isPlatformSync()) {
            this.addSync(value);
        }
        else {
            this.addAsync(value);
        }
    }
    transformFn(value) {
        return (v) => {
            const metric = new RateMetric(value);
            if (v) {
                try {
                    const persistedMetric = new RateMetric(v);
                    metric.set({
                        numerator: saturatingAdd(metric.numerator, persistedMetric.numerator),
                        denominator: saturatingAdd(metric.denominator, persistedMetric.denominator)
                    });
                }
                catch (_a) {
                    log(LOG_TAG, `Unexpected value found in storage for metric ${this.name}: ${JSON.stringify(v)}. Overwriting.`);
                }
            }
            return metric;
        };
    }
    addAsync(value) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            try {
                await Context.metricsDatabase.transform(this, this.transformFn(value));
            }
            catch (e) {
                if (e instanceof MetricValidationError) {
                    await e.recordError(this);
                }
            }
        });
    }
    addSync(value) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        try {
            Context.metricsDatabase.transform(this, this.transformFn(value));
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
        __classPrivateFieldSet(this, _inner, new InternalRateMetricType(meta), "f");
    }
    addToNumerator(amount) {
        __classPrivateFieldGet(this, _inner, "f").addToNumerator(amount);
    }
    addToDenominator(amount) {
        __classPrivateFieldGet(this, _inner, "f").addToDenominator(amount);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_inner = new WeakMap();
