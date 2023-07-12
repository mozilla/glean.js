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
import { testOnlyCheck, truncateStringAtBoundaryWithError, truncateStringAtBoundaryWithErrorSync } from "../../utils.js";
import { MetricType } from "../index.js";
import { Context } from "../../context.js";
import { MetricValidationError, MetricValidation, Metric } from "../metric.js";
import { ErrorType } from "../../error/error_type.js";
import { validateString } from "../utils.js";
const LOG_TAG = "core.metrics.URLMetricType";
const URL_MAX_LENGTH = 8192;
const URL_VALIDATION_REGEX = /^[a-zA-Z][a-zA-Z0-9-\+\.]*:(.*)$/;
export class UrlMetric extends Metric {
    constructor(v) {
        super(v);
    }
    validate(v) {
        const validation = validateString(v);
        if (validation.type === MetricValidation.Error) {
            return validation;
        }
        const str = v;
        if (str.startsWith("data:")) {
            return {
                type: MetricValidation.Error,
                errorMessage: "URL metric does not support data URLs",
                errorType: ErrorType.InvalidValue
            };
        }
        if (!URL_VALIDATION_REGEX.test(str)) {
            return {
                type: MetricValidation.Error,
                errorMessage: `"${str}" does not start with a valid URL scheme`,
                errorType: ErrorType.InvalidValue
            };
        }
        return { type: MetricValidation.Success };
    }
    payload() {
        return this.inner;
    }
}
class InternalUrlMetricType extends MetricType {
    constructor(meta) {
        super("url", meta, UrlMetric);
    }
    setUrl(url) {
        if (Context.isPlatformSync()) {
            this.setSync(url.toString());
        }
        else {
            this.setAsync(url.toString());
        }
    }
    setAsync(url) {
        this.set(url);
    }
    set(url) {
        Context.dispatcher.launch(async () => {
            if (!this.shouldRecord(Context.uploadEnabled)) {
                return;
            }
            let formattedUrl;
            if (url.length > URL_MAX_LENGTH) {
                formattedUrl = await truncateStringAtBoundaryWithError(this, url, URL_MAX_LENGTH);
            }
            else {
                formattedUrl = url;
            }
            try {
                const metric = new UrlMetric(formattedUrl);
                await Context.metricsDatabase.record(this, metric);
            }
            catch (e) {
                if (e instanceof MetricValidationError) {
                    await e.recordError(this);
                }
            }
        });
    }
    setSync(url) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        let formattedUrl;
        if (url.length > URL_MAX_LENGTH) {
            formattedUrl = truncateStringAtBoundaryWithErrorSync(this, url, URL_MAX_LENGTH);
        }
        else {
            formattedUrl = url;
        }
        try {
            const metric = new UrlMetric(formattedUrl);
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
        __classPrivateFieldSet(this, _inner, new InternalUrlMetricType(meta), "f");
    }
    set(url) {
        __classPrivateFieldGet(this, _inner, "f").set(url);
    }
    setUrl(url) {
        __classPrivateFieldGet(this, _inner, "f").setUrl(url);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_inner = new WeakMap();
