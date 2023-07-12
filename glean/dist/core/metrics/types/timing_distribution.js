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
import { ErrorType } from "../../error/error_type.js";
import { constructFunctionalHistogramFromValues } from "../../../histogram/functional.js";
import { getCurrentTimeInNanoSeconds, isUndefined, testOnlyCheck } from "../../utils.js";
import { convertTimeUnitToNanos } from "../time_unit.js";
import { snapshot } from "../distributions.js";
import { extractAccumulatedValuesFromJsonValue, getNumNegativeSamples, getNumTooLongSamples } from "../distributions.js";
const LOG_TAG = "core.metrics.TimingDistributionMetricType";
const LOG_BASE = 2.0;
const BUCKETS_PER_MAGNITUDE = 8.0;
const MAX_SAMPLE_TIME = 1000 * 1000 * 1000 * 60 * 10;
export class TimingDistributionMetric extends Metric {
    constructor(v) {
        super(v);
    }
    get timingDistribution() {
        return this.inner;
    }
    validate(v) {
        if (isUndefined(v) || !Array.isArray(v)) {
            return {
                type: MetricValidation.Error,
                errorType: ErrorType.InvalidType,
                errorMessage: `Expected valid TimingDistribution object, got ${JSON.stringify(v)}`
            };
        }
        const negativeDuration = v.find((key) => key < 0);
        if (negativeDuration) {
            return {
                type: MetricValidation.Error,
                errorType: ErrorType.InvalidValue,
                errorMessage: `Expected all durations to be greater than 0, got ${negativeDuration}`
            };
        }
        return { type: MetricValidation.Success };
    }
    payload() {
        const hist = constructFunctionalHistogramFromValues(this.inner, LOG_BASE, BUCKETS_PER_MAGNITUDE);
        return {
            values: hist.values,
            sum: hist.sum
        };
    }
}
class InternalTimingDistributionMetricType extends MetricType {
    constructor(meta, timeUnit) {
        super("timing_distribution", meta, TimingDistributionMetric);
        this.timeUnit = timeUnit;
        this.startTimes = {};
        this.timerId = 0;
    }
    getNextTimerId() {
        this.timerId++;
        return this.timerId;
    }
    start() {
        const startTime = getCurrentTimeInNanoSeconds();
        const id = this.getNextTimerId();
        if (Context.isPlatformSync()) {
            this.setStartSync(id, startTime);
        }
        else {
            this.setStart(id, startTime);
        }
        return id;
    }
    setStart(id, startTime) {
        this.setStartAsync(id, startTime);
    }
    stopAndAccumulate(id) {
        const stopTime = getCurrentTimeInNanoSeconds();
        if (Context.isPlatformSync()) {
            this.setStopAndAccumulateSync(id, stopTime);
        }
        else {
            this.setStopAndAccumulate(id, stopTime);
        }
    }
    setStopAndAccumulate(id, stopTime) {
        this.setStopAndAccumulateAsync(id, stopTime);
    }
    cancel(id) {
        delete this.startTimes[id];
    }
    accumulateSamples(samples) {
        if (Context.isPlatformSync()) {
            this.setAccumulateSamplesSync(samples);
        }
        else {
            this.setAccumulateSamples(samples);
        }
    }
    setAccumulateSamples(samples) {
        this.setAccumulateSamplesAsync(samples);
    }
    accumulateRawSamplesNanos(samples) {
        if (Context.isPlatformSync()) {
            this.accumulateRawSamplesNanosSync(samples);
        }
        else {
            this.accumulateRawSamplesNanosAsync(samples);
        }
    }
    setStopAndAccumulateTransformFn(duration) {
        return (old) => {
            const values = extractAccumulatedValuesFromJsonValue(old);
            return new TimingDistributionMetric([...values, duration]);
        };
    }
    setAccumulateSamplesTransformFn(samples, maxSampleTime) {
        return (old) => {
            const values = extractAccumulatedValuesFromJsonValue(old);
            const convertedSamples = [];
            samples.forEach((sample) => {
                if (sample >= 0) {
                    if (sample === 0) {
                        sample = 1;
                    }
                    else if (sample > maxSampleTime) {
                        sample = maxSampleTime;
                    }
                    sample = convertTimeUnitToNanos(sample, this.timeUnit);
                    convertedSamples.push(sample);
                }
            });
            return new TimingDistributionMetric([...values, ...convertedSamples]);
        };
    }
    accumulateRawSamplesNanosTransformFn(samples, maxSampleTime) {
        const minSampleTime = convertTimeUnitToNanos(1, this.timeUnit);
        return (old) => {
            const values = extractAccumulatedValuesFromJsonValue(old);
            const convertedSamples = [];
            samples.forEach((sample) => {
                if (sample < minSampleTime) {
                    sample = minSampleTime;
                }
                else if (sample > maxSampleTime) {
                    sample = maxSampleTime;
                }
                convertedSamples.push(sample);
            });
            return new TimingDistributionMetric([...values, ...convertedSamples]);
        };
    }
    setStartAsync(id, startTime) {
        Context.dispatcher.launch(async () => {
            this.startTimes[id] = startTime;
            return Promise.resolve();
        });
    }
    setStopAndAccumulateAsync(id, stopTime) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                delete this.startTimes[id];
                return;
            }
            const startTime = this.startTimes[id];
            if (startTime !== undefined) {
                delete this.startTimes[id];
            }
            else {
                await Context.errorManager.record(this, ErrorType.InvalidState, "Timing not running");
                return;
            }
            let duration = stopTime - startTime;
            if (duration < 0) {
                await Context.errorManager.record(this, ErrorType.InvalidValue, "Timer stopped with negative duration");
                return;
            }
            const minSampleTime = convertTimeUnitToNanos(1, this.timeUnit);
            const maxSampleTime = convertTimeUnitToNanos(MAX_SAMPLE_TIME, this.timeUnit);
            if (duration < minSampleTime) {
                duration = minSampleTime;
            }
            else if (duration > maxSampleTime) {
                await Context.errorManager.record(this, ErrorType.InvalidState, `Sample is longer than the max for a timeUnit of ${this.timeUnit} (${duration} ns)`);
                duration = maxSampleTime;
            }
            try {
                await Context.metricsDatabase.transform(this, this.setStopAndAccumulateTransformFn(duration));
            }
            catch (e) {
                if (e instanceof MetricValidationError) {
                    await e.recordError(this);
                }
            }
            return Promise.resolve();
        });
    }
    setAccumulateSamplesAsync(samples) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            const maxSampleTime = convertTimeUnitToNanos(MAX_SAMPLE_TIME, this.timeUnit);
            await Context.metricsDatabase.transform(this, this.setAccumulateSamplesTransformFn(samples, maxSampleTime));
            const numNegativeSamples = getNumNegativeSamples(samples);
            if (numNegativeSamples > 0) {
                await Context.errorManager.record(this, ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
            }
            const numTooLongSamples = getNumTooLongSamples(samples, maxSampleTime);
            if (numTooLongSamples > 0) {
                await Context.errorManager.record(this, ErrorType.InvalidOverflow, `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`, numTooLongSamples);
            }
        });
    }
    accumulateRawSamplesNanosAsync(samples) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            const maxSampleTime = convertTimeUnitToNanos(MAX_SAMPLE_TIME, this.timeUnit);
            await Context.metricsDatabase.transform(this, this.accumulateRawSamplesNanosTransformFn(samples, maxSampleTime));
            const numTooLongSamples = getNumTooLongSamples(samples, maxSampleTime);
            if (numTooLongSamples > 0) {
                await Context.errorManager.record(this, ErrorType.InvalidOverflow, `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`, numTooLongSamples);
            }
        });
    }
    setStartSync(id, startTime) {
        this.startTimes[id] = startTime;
    }
    setStopAndAccumulateSync(id, stopTime) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            delete this.startTimes[id];
            return;
        }
        const startTime = this.startTimes[id];
        if (startTime !== undefined) {
            delete this.startTimes[id];
        }
        else {
            Context.errorManager.record(this, ErrorType.InvalidState, "Timing not running");
            return;
        }
        let duration = stopTime - startTime;
        if (duration < 0) {
            Context.errorManager.record(this, ErrorType.InvalidValue, "Timer stopped with negative duration");
            return;
        }
        const minSampleTime = convertTimeUnitToNanos(1, this.timeUnit);
        const maxSampleTime = convertTimeUnitToNanos(MAX_SAMPLE_TIME, this.timeUnit);
        if (duration < minSampleTime) {
            duration = minSampleTime;
        }
        else if (duration > maxSampleTime) {
            Context.errorManager.record(this, ErrorType.InvalidState, `Sample is longer than the max for a timeUnit of ${this.timeUnit} (${duration} ns)`);
            duration = maxSampleTime;
        }
        try {
            Context.metricsDatabase.transform(this, this.setStopAndAccumulateTransformFn(duration));
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    setAccumulateSamplesSync(samples) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        const maxSampleTime = convertTimeUnitToNanos(MAX_SAMPLE_TIME, this.timeUnit);
        Context.metricsDatabase.transform(this, this.setAccumulateSamplesTransformFn(samples, maxSampleTime));
        const numNegativeSamples = getNumNegativeSamples(samples);
        if (numNegativeSamples > 0) {
            Context.errorManager.record(this, ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
        }
        const numTooLongSamples = getNumTooLongSamples(samples, maxSampleTime);
        if (numTooLongSamples > 0) {
            Context.errorManager.record(this, ErrorType.InvalidOverflow, `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`, numTooLongSamples);
        }
    }
    accumulateRawSamplesNanosSync(samples) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        const maxSampleTime = convertTimeUnitToNanos(MAX_SAMPLE_TIME, this.timeUnit);
        Context.metricsDatabase.transform(this, this.accumulateRawSamplesNanosTransformFn(samples, maxSampleTime));
        const numTooLongSamples = getNumTooLongSamples(samples, maxSampleTime);
        if (numTooLongSamples > 0) {
            Context.errorManager.record(this, ErrorType.InvalidOverflow, `${numTooLongSamples} samples are longer than the maximum of ${maxSampleTime}`, numTooLongSamples);
        }
    }
    async testGetValue(ping = this.sendInPings[0]) {
        if (testOnlyCheck("testGetValue", LOG_TAG)) {
            let value;
            await Context.dispatcher.testLaunch(async () => {
                value = await Context.metricsDatabase.getMetric(ping, this);
            });
            if (value) {
                return snapshot(constructFunctionalHistogramFromValues(value, LOG_BASE, BUCKETS_PER_MAGNITUDE));
            }
        }
    }
    async testGetNumRecordedErrors(errorType, ping = this.sendInPings[0]) {
        if (testOnlyCheck("testGetNumRecordedErrors")) {
            return Context.errorManager.testGetNumRecordedErrors(this, errorType, ping);
        }
        return 0;
    }
}
export default class {
    constructor(meta, timeUnit) {
        _inner.set(this, void 0);
        __classPrivateFieldSet(this, _inner, new InternalTimingDistributionMetricType(meta, timeUnit), "f");
    }
    start() {
        const id = __classPrivateFieldGet(this, _inner, "f").start();
        return id;
    }
    setStart(id, startTime) {
        __classPrivateFieldGet(this, _inner, "f").setStart(id, startTime);
    }
    stopAndAccumulate(id) {
        __classPrivateFieldGet(this, _inner, "f").stopAndAccumulate(id);
    }
    setStopAndAccumulate(id, stopTime) {
        __classPrivateFieldGet(this, _inner, "f").setStopAndAccumulate(id, stopTime);
    }
    accumulateRawSamplesNanos(samples) {
        __classPrivateFieldGet(this, _inner, "f").accumulateRawSamplesNanos(samples);
    }
    accumulateSamples(samples) {
        __classPrivateFieldGet(this, _inner, "f").accumulateSamples(samples);
    }
    setAccumulateSamples(samples) {
        __classPrivateFieldGet(this, _inner, "f").setAccumulateSamples(samples);
    }
    cancel(id) {
        __classPrivateFieldGet(this, _inner, "f").cancel(id);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_inner = new WeakMap();
