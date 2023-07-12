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
var _EventMetricType_inner;
import { RecordedEvent } from "../events_database/recorded_event.js";
import { MetricType } from "../index.js";
import { getMonotonicNow, isString, testOnlyCheck, truncateStringAtBoundaryWithError, truncateStringAtBoundaryWithErrorSync } from "../../utils.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";
import { MetricValidationError } from "../metric.js";
const LOG_TAG = "core.metrics.EventMetricType";
const MAX_LENGTH_EXTRA_KEY_VALUE = 100;
export class InternalEventMetricType extends MetricType {
    constructor(meta, allowedExtraKeys) {
        super("event", meta);
        this.allowedExtraKeys = allowedExtraKeys;
    }
    record(extra, timestamp = getMonotonicNow()) {
        if (Context.isPlatformSync()) {
            this.recordSync(timestamp, extra);
        }
        else {
            this.recordAsync(timestamp, extra);
        }
    }
    recordAsync(timestamp, extra) {
        Context.dispatcher.launch(async () => {
            await this.recordUndispatched(extra, timestamp);
        });
    }
    async recordUndispatched(extra, timestamp = getMonotonicNow()) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        try {
            const metric = new RecordedEvent({
                category: this.category,
                name: this.name,
                timestamp,
                extra
            });
            let truncatedExtra = undefined;
            if (extra && this.allowedExtraKeys) {
                truncatedExtra = {};
                for (const [name, value] of Object.entries(extra)) {
                    if (this.allowedExtraKeys.includes(name)) {
                        if (isString(value)) {
                            truncatedExtra[name] = await truncateStringAtBoundaryWithError(this, value, MAX_LENGTH_EXTRA_KEY_VALUE);
                        }
                        else {
                            truncatedExtra[name] = value;
                        }
                    }
                    else {
                        await Context.errorManager.record(this, ErrorType.InvalidValue, `Invalid key index: ${name}`);
                        continue;
                    }
                }
            }
            metric.set({
                ...metric.get(),
                extra: truncatedExtra
            });
            return Context.eventsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                await e.recordError(this);
            }
        }
    }
    recordSync(timestamp, extra) {
        if (!this.shouldRecord(Context.uploadEnabled)) {
            return;
        }
        try {
            const metric = new RecordedEvent({
                category: this.category,
                name: this.name,
                timestamp,
                extra
            });
            let truncatedExtra = undefined;
            if (extra && this.allowedExtraKeys) {
                truncatedExtra = {};
                for (const [name, value] of Object.entries(extra)) {
                    if (this.allowedExtraKeys.includes(name)) {
                        if (isString(value)) {
                            truncatedExtra[name] = truncateStringAtBoundaryWithErrorSync(this, value, MAX_LENGTH_EXTRA_KEY_VALUE);
                        }
                        else {
                            truncatedExtra[name] = value;
                        }
                    }
                    else {
                        Context.errorManager.record(this, ErrorType.InvalidValue, `Invalid key index: ${name}`);
                        continue;
                    }
                }
            }
            metric.set({
                ...metric.get(),
                extra: truncatedExtra
            });
            Context.eventsDatabase.record(this, metric);
        }
        catch (e) {
            if (e instanceof MetricValidationError) {
                e.recordErrorSync(this);
            }
        }
    }
    async testGetValue(ping = this.sendInPings[0]) {
        if (testOnlyCheck("testGetValue", LOG_TAG)) {
            let events;
            await Context.dispatcher.testLaunch(async () => {
                events = await Context.eventsDatabase.getEvents(ping, this);
            });
            return events;
        }
    }
}
export default class EventMetricType {
    constructor(meta, allowedExtraKeys) {
        _EventMetricType_inner.set(this, void 0);
        __classPrivateFieldSet(this, _EventMetricType_inner, new InternalEventMetricType(meta, allowedExtraKeys), "f");
    }
    record(extra) {
        __classPrivateFieldGet(this, _EventMetricType_inner, "f").record(extra);
    }
    async testGetValue(ping = __classPrivateFieldGet(this, _EventMetricType_inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _EventMetricType_inner, "f").testGetValue(ping);
    }
    async testGetNumRecordedErrors(errorType, ping = __classPrivateFieldGet(this, _EventMetricType_inner, "f").sendInPings[0]) {
        return __classPrivateFieldGet(this, _EventMetricType_inner, "f").testGetNumRecordedErrors(errorType, ping);
    }
}
_EventMetricType_inner = new WeakMap();
