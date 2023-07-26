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
import { Context } from "../../context.js";
import { Metric, MetricValidation, MetricValidationError } from "../metric.js";
import { MetricType } from "../index.js";
import { ErrorType } from "../../error/error_type.js";
import { HistogramType } from "../../../histogram/histogram.js";
import { constructExponentialHistogramFromValues } from "../../../histogram/exponential.js";
import { constructLinearHistogramFromValues } from "../../../histogram/linear.js";
import { extractAccumulatedValuesFromJsonValue, getNumNegativeSamples, snapshot } from "../distributions.js";
import { isUndefined, testOnlyCheck } from "../../utils.js";
const LOG_TAG = "core.metrics.CustomDistributionMetricType";
export class CustomDistributionMetric extends Metric {
    constructor(v) {
        super(v);
    }
    get customDistribution() {
        return this.inner;
    }
    validate(v) {
        const obj = v;
        if (isUndefined(obj)) {
            return {
                type: MetricValidation.Error,
                errorType: ErrorType.InvalidType,
                errorMessage: `Expected valid CustomDistribution object, got ${JSON.stringify(obj)}`
            };
        }
        if (isUndefined(obj.bucketCount) || obj.bucketCount < 0) {
            return {
                type: MetricValidation.Error,
                errorType: ErrorType.InvalidValue,
                errorMessage: `Expected bucket count to be greater than 0, got ${obj.bucketCount}`
            };
        }
        if (isUndefined(obj.rangeMin) || obj.rangeMin < 0) {
            return {
                type: MetricValidation.Error,
                errorType: ErrorType.InvalidValue,
                errorMessage: `Expected histogram rangeMin to be greater than 0, got ${obj.rangeMin}`
            };
        }
        if (isUndefined(obj.rangeMax) || obj.rangeMax < 0) {
            return {
                type: MetricValidation.Error,
                errorType: ErrorType.InvalidValue,
                errorMessage: `Expected histogram rangeMax to be greater than 0, got ${obj.rangeMax}`
            };
        }
        if (isUndefined(obj.histogramType) || !(obj.histogramType in HistogramType)) {
            return {
                type: MetricValidation.Error,
                errorType: ErrorType.InvalidValue,
                errorMessage: `Expected histogram type to be either Linear or Exponential, got ${obj.histogramType}`
            };
        }
        return {
            type: MetricValidation.Success
        };
    }
    payload() {
        const { bucketCount, histogramType, rangeMax, rangeMin, values } = this.inner;
        const hist = constructHistogramByType(values, rangeMin, rangeMax, bucketCount, histogramType);
        return {
            sum: hist.sum,
            values: hist.values
        };
    }
}
class InternalCustomDistributionMetricType extends MetricType {
    constructor(meta, rangeMin, rangeMax, bucketCount, histogramType) {
        super("custom_distribution", meta, CustomDistributionMetric);
        this.rangeMin = rangeMin;
        this.rangeMax = rangeMax;
        this.bucketCount = bucketCount;
        this.histogramType = histogramType;
    }
    accumulateSamples(samples) {
        if (Context.isPlatformSync()) {
            this.setSync(samples);
        }
        else {
            this.setAsync(samples);
        }
    }
    transformFn(samples) {
        return (old) => {
            const values = extractAccumulatedValuesFromJsonValue(old);
            const convertedSamples = [];
            samples.forEach((sample) => {
                if (sample >= 0) {
                    convertedSamples.push(sample);
                }
            });
            return new CustomDistributionMetric({
                values: [...values, ...convertedSamples],
                rangeMin: this.rangeMin,
                rangeMax: this.rangeMax,
                bucketCount: this.bucketCount,
                histogramType: this.histogramType
            });
        };
    }
    setAsync(samples) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            try {
                await Context.metricsDatabase.transform(this, this.transformFn(samples));
                const numNegativeSamples = getNumNegativeSamples(samples);
                if (numNegativeSamples > 0) {
                    await Context.errorManager.record(this, ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
                }
            }
            catch (e) {
                if (e instanceof MetricValidationError) {
                    await e.recordError(this);
                }
            }
        });
    }
    setSync(samples) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        try {
            Context.metricsDatabase.transform(this, this.transformFn(samples));
            const numNegativeSamples = getNumNegativeSamples(samples);
            if (numNegativeSamples > 0) {
                Context.errorManager.record(this, ErrorType.InvalidValue, `Accumulated ${numNegativeSamples} negative samples`, numNegativeSamples);
            }
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    async testGetValue(ping = this.sendInPings[0]) {
        if (testOnlyCheck("testGetValue", LOG_TAG)) {
            let value;
            await Context.dispatcher.testLaunch(async () => {
                value = await Context.metricsDatabase.getMetric(ping, this);
            });
            if (value) {
                const { bucketCount, histogramType, rangeMax, rangeMin, values } = value;
                return snapshot(constructHistogramByType(values, rangeMin, rangeMax, bucketCount, histogramType));
            }
        }
    }
}
export default class {
    constructor(meta, rangeMin, rangeMax, bucketCount, histogramType) {
        _inner.set(this, void 0);
        __classPrivateFieldSet(this, _inner, new InternalCustomDistributionMetricType(meta, rangeMin, rangeMax, bucketCount, histogramType), "f");
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
function constructHistogramByType(values, rangeMin, rangeMax, bucketCount, histogramType) {
    switch (histogramType) {
        case HistogramType.exponential:
            return constructExponentialHistogramFromValues(values, rangeMin, rangeMax, bucketCount);
        case HistogramType.linear:
            return constructLinearHistogramFromValues(values, rangeMin, rangeMax, bucketCount);
    }
}
