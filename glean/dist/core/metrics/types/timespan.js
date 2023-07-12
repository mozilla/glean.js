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
import { isInteger } from "../../utils.js";
import TimeUnit from "../time_unit.js";
import { MetricType } from "../index.js";
import { isString, isObject, isUndefined, getMonotonicNow, testOnlyCheck } from "../../utils.js";
import { MetricValidation, MetricValidationError } from "../metric.js";
import { Metric } from "../metric.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";
const LOG_TAG = "core.metrics.TimespanMetricType";
export class TimespanMetric extends Metric {
    constructor(v) {
        super(v);
    }
    get timespan() {
        switch (this.inner.timeUnit) {
            case TimeUnit.Nanosecond:
                return this.inner.timespan * 10 ** 6;
            case TimeUnit.Microsecond:
                return this.inner.timespan * 10 ** 3;
            case TimeUnit.Millisecond:
                return this.inner.timespan;
            case TimeUnit.Second:
                return Math.round(this.inner.timespan / 1000);
            case TimeUnit.Minute:
                return Math.round(this.inner.timespan / 1000 / 60);
            case TimeUnit.Hour:
                return Math.round(this.inner.timespan / 1000 / 60 / 60);
            case TimeUnit.Day:
                return Math.round(this.inner.timespan / 1000 / 60 / 60 / 24);
        }
    }
    validateTimespan(v) {
        if (!isInteger(v)) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Expected integer value, got ${JSON.stringify(v)}`
            };
        }
        if (v < 0) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Expected positive value, got ${JSON.stringify(v)}`,
                errorType: ErrorType.InvalidValue
            };
        }
        return { type: MetricValidation.Success };
    }
    validate(v) {
        if (!isObject(v) || Object.keys(v).length !== 2 || !("timespan" in v) || !("timeUnit" in v)) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Expected timespan object, got ${JSON.stringify(v)}`
            };
        }
        const timespanVerification = this.validateTimespan(v.timespan);
        if (timespanVerification.type === MetricValidation.Error) {
            return timespanVerification;
        }
        const timeUnitVerification = "timeUnit" in v &&
            isString(v.timeUnit) &&
            Object.values(TimeUnit).includes(v.timeUnit);
        if (!timeUnitVerification) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Expected valid timeUnit for timespan, got ${JSON.stringify(v)}`
            };
        }
        return { type: MetricValidation.Success };
    }
    payload() {
        return {
            time_unit: this.inner.timeUnit,
            value: this.timespan
        };
    }
}
export class InternalTimespanMetricType extends MetricType {
    constructor(meta, timeUnit) {
        super("timespan", meta, TimespanMetric);
        this.timeUnit = timeUnit;
    }
    start() {
        if (Context.isPlatformSync()) {
            this.startSync();
        }
        else {
            this.startAsync();
        }
    }
    stop() {
        if (Context.isPlatformSync()) {
            this.stopSync();
        }
        else {
            this.stopAsync();
        }
    }
    cancel() {
        if (Context.isPlatformSync()) {
            this.cancelSync();
        }
        else {
            this.cancelAsync();
        }
    }
    setRawNanos(elapsed) {
        if (Context.isPlatformSync()) {
            this.setRawNanosSync(elapsed);
        }
        else {
            this.setRawNanosAsync(elapsed);
        }
    }
    startAsync() {
        const startTime = getMonotonicNow();
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            if (!isUndefined(this.startTime)) {
                await Context.errorManager.record(this, ErrorType.InvalidState, "Timespan already started");
                return;
            }
            this.startTime = startTime;
            return Promise.resolve();
        });
    }
    stopAsync() {
        const stopTime = getMonotonicNow();
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                this.startTime = undefined;
                return;
            }
            if (isUndefined(this.startTime)) {
                await Context.errorManager.record(this, ErrorType.InvalidState, "Timespan not running.");
                return;
            }
            const elapsed = stopTime - this.startTime;
            this.startTime = undefined;
            if (elapsed < 0) {
                await Context.errorManager.record(this, ErrorType.InvalidState, "Timespan was negative.");
                return;
            }
            await this.setRawUndispatched(elapsed);
        });
    }
    cancelAsync() {
        Context.dispatcher.launch(() => {
            this.startTime = undefined;
            return Promise.resolve();
        });
    }
    setRawNanosAsync(elapsed) {
        Context.dispatcher.launch(async () => {
            const elapsedMillis = elapsed * 10 ** -6;
            await this.setRawUndispatched(elapsedMillis);
        });
    }
    async setRawUndispatched(elapsed) {
        await this.setRawAsync(elapsed);
    }
    async setRawAsync(elapsed) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        if (!isUndefined(this.startTime)) {
            await Context.errorManager.record(this, ErrorType.InvalidState, "Timespan already running. Raw value not recorded.");
            return;
        }
        let reportValueExists = false;
        try {
            const transformFn = ((elapsed) => {
                return (old) => {
                    let metric;
                    try {
                        metric = new TimespanMetric(old);
                        reportValueExists = true;
                    }
                    catch (_a) {
                        metric = new TimespanMetric({
                            timespan: elapsed,
                            timeUnit: this.timeUnit
                        });
                    }
                    return metric;
                };
            })(elapsed);
            await Context.metricsDatabase.transform(this, transformFn);
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                await e.recordError(this);
            }
        }
        if (reportValueExists) {
            await Context.errorManager.record(this, ErrorType.InvalidState, "Timespan value already recorded. New value discarded.");
        }
    }
    startSync() {
        const startTime = getMonotonicNow();
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        if (!isUndefined(this.startTime)) {
            Context.errorManager.record(this, ErrorType.InvalidState, "Timespan already started");
            return;
        }
        this.startTime = startTime;
    }
    stopSync() {
        const stopTime = getMonotonicNow();
        if (!this.shouldRecord(Context.uploadEnabled)) {
            this.startTime = undefined;
            return;
        }
        if (isUndefined(this.startTime)) {
            Context.errorManager.record(this, ErrorType.InvalidState, "Timespan not running.");
            return;
        }
        const elapsed = stopTime - this.startTime;
        this.startTime = undefined;
        if (elapsed < 0) {
            Context.errorManager.record(this, ErrorType.InvalidState, "Timespan was negative.");
            return;
        }
        this.setRawSync(elapsed);
    }
    cancelSync() {
        this.startTime = undefined;
    }
    setRawNanosSync(elapsed) {
        const elapsedMillis = elapsed * 10 ** -6;
        this.setRawSync(elapsedMillis);
    }
    setRawSync(elapsed) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        if (!isUndefined(this.startTime)) {
            Context.errorManager.record(this, ErrorType.InvalidState, "Timespan already running. Raw value not recorded.");
            return;
        }
        let reportValueExists = false;
        try {
            const transformFn = ((elapsed) => {
                return (old) => {
                    let metric;
                    try {
                        metric = new TimespanMetric(old);
                        reportValueExists = true;
                    }
                    catch (_a) {
                        metric = new TimespanMetric({
                            timespan: elapsed,
                            timeUnit: this.timeUnit
                        });
                    }
                    return metric;
                };
            })(elapsed);
            Context.metricsDatabase.transform(this, transformFn);
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
        if (reportValueExists) {
            Context.errorManager.record(this, ErrorType.InvalidState, "Timespan value already recorded. New value discarded.");
        }
    }
    async testGetValue(ping = this.sendInPings[0]) {
        if (testOnlyCheck("testGetValue", LOG_TAG)) {
            let value;
            await Context.dispatcher.testLaunch(async () => {
                value = await Context.metricsDatabase.getMetric(ping, this);
            });
            if (value) {
                return new TimespanMetric(value).timespan;
            }
        }
    }
}
export default class {
    constructor(meta, timeUnit) {
        _inner.set(this, void 0);
        __classPrivateFieldSet(this, _inner, new InternalTimespanMetricType(meta, timeUnit), "f");
    }
    start() {
        __classPrivateFieldGet(this, _inner, "f").start();
    }
    stop() {
        __classPrivateFieldGet(this, _inner, "f").stop();
    }
    cancel() {
        __classPrivateFieldGet(this, _inner, "f").cancel();
    }
    setRawNanos(elapsed) {
        __classPrivateFieldGet(this, _inner, "f").setRawNanos(elapsed);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_inner = new WeakMap();
