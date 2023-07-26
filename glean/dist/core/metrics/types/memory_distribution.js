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
import { Metric, MetricValidation, MetricValidationError } from "../metric.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";
import { isUndefined, testOnlyCheck } from "../../utils.js";
import { constructFunctionalHistogramFromValues } from "../../../histogram/functional.js";
import { extractAccumulatedValuesFromJsonValue, getNumNegativeSamples, getNumTooLongSamples, snapshot } from "../distributions.js";
import { convertMemoryUnitToBytes } from "../memory_unit.js";
const LOG_TAG = "core.metrics.MemoryDistributionMetricType";
const LOG_BASE = 2.0;
const BUCKETS_PER_MAGNITUDE = 16.0;
const MAX_BYTES = 2 ** 40;
export class MemoryDistributionMetric extends Metric {
    constructor(v) {
        super(v);
    }
    get memoryDistribution() {
        return this.inner;
    }
    validate(v) {
        if (isUndefined(v) || !Array.isArray(v)) {
            return {
                type: MetricValidation.Error,
                errorType: ErrorType.InvalidType,
                errorMessage: `Expected valid MemoryDistribution object, got ${JSON.stringify(v)}`
            };
        }
        const negativeSample = v.find((key) => key < 0);
        if (negativeSample) {
            return {
                type: MetricValidation.Error,
                errorType: ErrorType.InvalidValue,
                errorMessage: `Expected all samples to be greater than 0, got ${negativeSample}`
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
class InternalMemoryDistributionMetricType extends MetricType {
    constructor(meta, memoryUnit) {
        super("memory_distribution", meta, MemoryDistributionMetric);
        this.memoryUnit = memoryUnit;
    }
    accumulate(sample) {
        if (Context.isPlatformSync()) {
            this.accumulateSync(sample);
        }
        else {
            this.accumulateAsync(sample);
        }
    }
    accumulateTransformFn(sample) {
        return (old) => {
            const values = extractAccumulatedValuesFromJsonValue(old);
            return new MemoryDistributionMetric([...values, sample]);
        };
    }
    accumulateSamples(samples) {
        if (Context.isPlatformSync()) {
            this.accumulateSamplesSync(samples);
        }
        else {
            this.accumulateSamplesAsync(samples);
        }
    }
    accumulateSamplesTransformFn(samples) {
        return (old) => {
            const values = extractAccumulatedValuesFromJsonValue(old);
            const convertedSamples = [];
            samples.forEach((sample) => {
                if (sample >= 0) {
                    sample = convertMemoryUnitToBytes(sample, this.memoryUnit);
                    if (sample > MAX_BYTES) {
                        sample = MAX_BYTES;
                    }
                    convertedSamples.push(sample);
                }
            });
            return new MemoryDistributionMetric([...values, ...convertedSamples]);
        };
    }
    accumulateAsync(sample) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            if (sample < 0) {
                await Context.errorManager.record(this, ErrorType.InvalidValue, "Accumulated a negative sample");
                return;
            }
            let convertedSample = convertMemoryUnitToBytes(sample, this.memoryUnit);
            if (sample > MAX_BYTES) {
                await Context.errorManager.record(this, ErrorType.InvalidValue, "Sample is bigger than 1 terabyte.");
                convertedSample = MAX_BYTES;
            }
            try {
                await Context.metricsDatabase.transform(this, this.accumulateTransformFn(convertedSample));
            }
            catch (e) {
                if (e instanceof MetricValidationError) {
                    await e.recordError(this);
                }
            }
        });
    }
    accumulateSamplesAsync(samples) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            await Context.metricsDatabase.transform(this, this.accumulateSamplesTransformFn(samples));
            const numNegativeSamples = getNumNegativeSamples(samples);
            if (numNegativeSamples > 0) {
                await Context.errorManager.record(this, ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
            }
            const numTooLongSamples = getNumTooLongSamples(samples, MAX_BYTES);
            if (numTooLongSamples > 0) {
                await Context.errorManager.record(this, ErrorType.InvalidValue, `Accumulated ${numTooLongSamples} larger than 1TB`, numTooLongSamples);
            }
        });
    }
    accumulateSync(sample) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        if (sample < 0) {
            Context.errorManager.record(this, ErrorType.InvalidValue, "Accumulated a negative sample");
            return;
        }
        let convertedSample = convertMemoryUnitToBytes(sample, this.memoryUnit);
        if (sample > MAX_BYTES) {
            Context.errorManager.record(this, ErrorType.InvalidValue, "Sample is bigger than 1 terabyte.");
            convertedSample = MAX_BYTES;
        }
        try {
            Context.metricsDatabase.transform(this, this.accumulateTransformFn(convertedSample));
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    accumulateSamplesSync(samples) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        Context.metricsDatabase.transform(this, this.accumulateSamplesTransformFn(samples));
        const numNegativeSamples = getNumNegativeSamples(samples);
        if (numNegativeSamples > 0) {
            Context.errorManager.record(this, ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
        }
        const numTooLongSamples = getNumTooLongSamples(samples, MAX_BYTES);
        if (numTooLongSamples > 0) {
            Context.errorManager.record(this, ErrorType.InvalidValue, `Accumulated ${numTooLongSamples} larger than 1TB`, numTooLongSamples);
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
    constructor(meta, memoryUnit) {
        _inner.set(this, void 0);
        __classPrivateFieldSet(this, _inner, new InternalMemoryDistributionMetricType(meta, memoryUnit), "f");
    }
    accumulate(sample) {
        __classPrivateFieldGet(this, _inner, "f").accumulate(sample);
    }
    accumulateSamples(samples) {
        __classPrivateFieldGet(this, _inner, "f").accumulateSamples(samples);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_inner = new WeakMap();
