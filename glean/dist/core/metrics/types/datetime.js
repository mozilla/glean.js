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
import TimeUnit from "../../metrics/time_unit.js";
import { Context } from "../../context.js";
import { MetricValidationError } from "../metric.js";
import { Metric, MetricValidation } from "../metric.js";
import { isNumber, isObject, isString, testOnlyCheck } from "../../utils.js";
const LOG_TAG = "core.metrics.DatetimeMetricType";
export function formatTimezoneOffset(timezone) {
    const offset = (timezone / 60) * -1;
    const sign = offset > 0 ? "+" : "-";
    const hours = Math.abs(offset).toString().padStart(2, "0");
    return `${sign}${hours}:00`;
}
export class DatetimeMetric extends Metric {
    constructor(v) {
        super(v);
    }
    static fromDate(v, timeUnit) {
        if (!(v instanceof Date)) {
            throw new MetricValidationError(`Expected Date object, got ${JSON.stringify(v)}`);
        }
        return new DatetimeMetric({
            timeUnit,
            timezone: v.getTimezoneOffset(),
            date: v.toISOString()
        });
    }
    static fromRawDatetime(isoString, timezoneOffset, timeUnit) {
        return new DatetimeMetric({
            timeUnit,
            timezone: timezoneOffset,
            date: isoString
        });
    }
    get date() {
        return new Date(this.inner.date);
    }
    get timezone() {
        return this.inner.timezone;
    }
    get timeUnit() {
        return this.inner.timeUnit;
    }
    get dateISOString() {
        return this.inner.date;
    }
    validate(v) {
        if (!isObject(v) || Object.keys(v).length !== 3) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Expected Glean datetime metric object, got ${JSON.stringify(v)}`
            };
        }
        const timeUnitVerification = "timeUnit" in v &&
            isString(v.timeUnit) &&
            Object.values(TimeUnit).includes(v.timeUnit);
        const timezoneVerification = "timezone" in v && isNumber(v.timezone);
        const dateVerification = "date" in v && isString(v.date) && v.date.length === 24 && !isNaN(Date.parse(v.date));
        if (!timeUnitVerification || !timezoneVerification || !dateVerification) {
            return {
                type: MetricValidation.Error,
                errorMessage: `Invalid property on datetime metric, got ${JSON.stringify(v)}`
            };
        }
        return { type: MetricValidation.Success };
    }
    payload() {
        const extractedDateInfo = this.dateISOString.match(/\d+/g);
        if (!extractedDateInfo || extractedDateInfo.length < 0) {
            throw new Error("IMPOSSIBLE: Unable to extract date information from DatetimeMetric.");
        }
        const correctedDate = new Date(parseInt(extractedDateInfo[0]), parseInt(extractedDateInfo[1]) - 1, parseInt(extractedDateInfo[2]), parseInt(extractedDateInfo[3]) - this.timezone / 60, parseInt(extractedDateInfo[4]), parseInt(extractedDateInfo[5]), parseInt(extractedDateInfo[6]));
        const timezone = formatTimezoneOffset(this.timezone);
        const year = correctedDate.getFullYear().toString().padStart(2, "0");
        const month = (correctedDate.getMonth() + 1).toString().padStart(2, "0");
        const day = correctedDate.getDate().toString().padStart(2, "0");
        if (this.timeUnit === TimeUnit.Day) {
            return `${year}-${month}-${day}${timezone}`;
        }
        const hours = correctedDate.getHours().toString().padStart(2, "0");
        if (this.timeUnit === TimeUnit.Hour) {
            return `${year}-${month}-${day}T${hours}${timezone}`;
        }
        const minutes = correctedDate.getMinutes().toString().padStart(2, "0");
        if (this.timeUnit === TimeUnit.Minute) {
            return `${year}-${month}-${day}T${hours}:${minutes}${timezone}`;
        }
        const seconds = correctedDate.getSeconds().toString().padStart(2, "0");
        if (this.timeUnit === TimeUnit.Second) {
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`;
        }
        const milliseconds = correctedDate.getMilliseconds().toString().padStart(3, "0");
        if (this.timeUnit === TimeUnit.Millisecond) {
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezone}`;
        }
        if (this.timeUnit === TimeUnit.Microsecond) {
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}000${timezone}`;
        }
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}000000${timezone}`;
    }
}
export class InternalDatetimeMetricType extends MetricType {
    constructor(meta, timeUnit) {
        super("datetime", meta, DatetimeMetric);
        this.timeUnit = timeUnit;
    }
    set(value) {
        if (Context.isPlatformSync()) {
            this.setSync(value);
        }
        else {
            this.setAsync(value);
        }
    }
    truncateDate(value) {
        if (!value) {
            value = new Date();
        }
        const truncatedDate = value;
        switch (this.timeUnit) {
            case TimeUnit.Day:
                truncatedDate.setMilliseconds(0);
                truncatedDate.setSeconds(0);
                truncatedDate.setMinutes(0);
                truncatedDate.setMilliseconds(0);
            case TimeUnit.Hour:
                truncatedDate.setMilliseconds(0);
                truncatedDate.setSeconds(0);
                truncatedDate.setMinutes(0);
            case TimeUnit.Minute:
                truncatedDate.setMilliseconds(0);
                truncatedDate.setSeconds(0);
            case TimeUnit.Second:
                truncatedDate.setMilliseconds(0);
            default:
                break;
        }
        return truncatedDate;
    }
    setAsync(value) {
        Context.dispatcher.launch(() => this.setUndispatched(value));
    }
    async setUndispatched(value) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        const truncatedDate = this.truncateDate(value);
        try {
            const metric = DatetimeMetric.fromDate(truncatedDate, this.timeUnit);
            await Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                await e.recordError(this);
            }
        }
    }
    setSync(value) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        const truncatedDate = this.truncateDate(value);
        try {
            const metric = DatetimeMetric.fromDate(truncatedDate, this.timeUnit);
            Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    setSyncRaw(isoString, timezone, timeUnit) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        try {
            const metric = DatetimeMetric.fromRawDatetime(isoString, timezone, timeUnit);
            Context.metricsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    async testGetValueAsDatetimeMetric(ping, fn) {
        if (testOnlyCheck(fn, LOG_TAG)) {
            let value;
            await Context.dispatcher.testLaunch(async () => {
                value = await Context.metricsDatabase.getMetric(ping, this);
            });
            if (value) {
                return new DatetimeMetric(value);
            }
        }
    }
    async testGetValueAsString(ping = this.sendInPings[0]) {
        const metric = await this.testGetValueAsDatetimeMetric(ping, "testGetValueAsString");
        return metric ? metric.payload() : undefined;
    }
    async testGetValue(ping = this.sendInPings[0]) {
        const metric = await this.testGetValueAsDatetimeMetric(ping, "testGetValue");
        return metric ? metric.date : undefined;
    }
}
export default class {
    constructor(meta, timeUnit) {
        _inner.set(this, void 0);
        __classPrivateFieldSet(this, _inner, new InternalDatetimeMetricType(meta, timeUnit), "f");
    }
    set(value) {
        __classPrivateFieldGet(this, _inner, "f").set(value);
    }
    async testGetValueAsString(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValueAsString(ping);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_inner = new WeakMap();
