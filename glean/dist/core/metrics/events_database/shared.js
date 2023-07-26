import { isString } from "../../utils.js";
import { InternalCounterMetricType as CounterMetricType } from "../types/counter.js";
import { generateReservedMetricIdentifiers } from "../database/shared.js";
import { EVENTS_PING_NAME, GLEAN_REFERENCE_TIME_EXTRA_KEY } from "../../constants.js";
import { InternalEventMetricType as EventMetricType } from "../types/event.js";
export const EVENT_DATABASE_LOG_TAG = "core.Metric.EventsDatabase";
export function createDateObject(str) {
    if (!isString(str)) {
        str = "";
    }
    const date = new Date(str);
    if (isNaN(date.getTime())) {
        throw new Error(`Error attempting to generate Date object from string: ${str}`);
    }
    return date;
}
export function getExecutionCounterMetric(sendInPings) {
    return new CounterMetricType({
        ...generateReservedMetricIdentifiers("execution_counter"),
        sendInPings: sendInPings.filter((name) => name !== EVENTS_PING_NAME),
        lifetime: "ping",
        disabled: false
    });
}
export function getGleanRestartedEventMetric(sendInPings) {
    return new EventMetricType({
        category: "glean",
        name: "restarted",
        sendInPings: sendInPings.filter((name) => name !== EVENTS_PING_NAME),
        lifetime: "ping",
        disabled: false
    }, [GLEAN_REFERENCE_TIME_EXTRA_KEY]);
}
export function isRestartedEvent(event) {
    var _a, _b;
    return !!((_b = (_a = event === null || event === void 0 ? void 0 : event.get()) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b[GLEAN_REFERENCE_TIME_EXTRA_KEY]);
}
export function removeTrailingRestartedEvents(sortedEvents) {
    while (!!sortedEvents.length && isRestartedEvent(sortedEvents[sortedEvents.length - 1])) {
        sortedEvents.pop();
    }
    return sortedEvents;
}
