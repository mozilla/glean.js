import { isUndefined } from "../../utils.js";
import log, { LoggingLevel } from "../../log.js";
import { Context } from "../../context.js";
import { RecordedEvent } from "./recorded_event.js";
import { EVENTS_PING_NAME, GLEAN_EXECUTION_COUNTER_EXTRA_KEY, GLEAN_REFERENCE_TIME_EXTRA_KEY } from "../../constants.js";
import { ErrorType } from "../../error/error_type.js";
import { createDateObject, EVENT_DATABASE_LOG_TAG, getExecutionCounterMetric, getGleanRestartedEventMetric, removeTrailingRestartedEvents } from "./shared.js";
async function recordGleanRestartedEvent(sendInPings, time = Context.startTime) {
    const metric = getGleanRestartedEventMetric(sendInPings);
    await metric.recordUndispatched({
        [GLEAN_REFERENCE_TIME_EXTRA_KEY]: time.toISOString()
    }, 0);
}
class EventsDatabase {
    constructor() {
        this.initialized = false;
        this.eventsStore = new Context.platform.Storage("events");
    }
    async initialize() {
        var _a;
        if (this.initialized) {
            return;
        }
        const storeNames = await this.getAvailableStoreNames();
        if (storeNames.includes(EVENTS_PING_NAME)) {
            const storedEvents = (_a = (await this.eventsStore.get([EVENTS_PING_NAME]))) !== null && _a !== void 0 ? _a : [];
            if (storedEvents.length > 0) {
                await Context.corePings.events.submitUndispatched("startup");
            }
        }
        await getExecutionCounterMetric(storeNames).addUndispatched(1);
        await recordGleanRestartedEvent(storeNames);
        this.initialized = true;
    }
    async record(metric, value) {
        if (metric.disabled) {
            return;
        }
        for (const ping of metric.sendInPings) {
            const executionCounter = getExecutionCounterMetric([ping]);
            let currentExecutionCount = await Context.metricsDatabase.getMetric(ping, executionCounter);
            if (!currentExecutionCount) {
                await executionCounter.addUndispatched(1);
                currentExecutionCount = 1;
                await recordGleanRestartedEvent([ping], new Date());
            }
            value.addExtra(GLEAN_EXECUTION_COUNTER_EXTRA_KEY, currentExecutionCount);
            let numEvents = 0;
            const transformFn = (v) => {
                var _a;
                const events = (_a = v) !== null && _a !== void 0 ? _a : [];
                events.push(value.get());
                numEvents = events.length;
                return events;
            };
            await this.eventsStore.update([ping], transformFn);
            if (ping === EVENTS_PING_NAME && numEvents >= Context.config.maxEvents) {
                await Context.corePings.events.submitUndispatched("max_capacity");
            }
        }
    }
    async getEvents(ping, metric) {
        const events = await this.getAndValidatePingData(ping);
        if (events.length === 0) {
            return;
        }
        return (events
            .filter((e) => e.get().category === metric.category && e.get().name === metric.name)
            .map((e) => e.withoutReservedExtras()));
    }
    async getPingEvents(ping, clearPingLifetimeData) {
        const pingData = await this.getAndValidatePingData(ping);
        if (clearPingLifetimeData && Object.keys(pingData).length > 0) {
            await this.eventsStore.delete([ping]);
        }
        if (pingData.length === 0) {
            return;
        }
        const payload = await this.prepareEventsPayload(ping, pingData);
        if (payload.length > 0) {
            return payload;
        }
    }
    async clearAll() {
        await this.eventsStore.delete([]);
    }
    async getAvailableStoreNames() {
        const data = await this.eventsStore.get([]);
        if (isUndefined(data)) {
            return [];
        }
        return Object.keys(data);
    }
    async getAndValidatePingData(ping) {
        const data = await this.eventsStore.get([ping]);
        if (isUndefined(data)) {
            return [];
        }
        if (!Array.isArray(data)) {
            log(EVENT_DATABASE_LOG_TAG, `Unexpected value found for ping ${ping}: ${JSON.stringify(data)}. Clearing.`, LoggingLevel.Error);
            await this.eventsStore.delete([ping]);
            return [];
        }
        return data.reduce((result, e) => {
            try {
                const event = new RecordedEvent(e);
                return [...result, event];
            }
            catch (_a) {
                log(EVENT_DATABASE_LOG_TAG, `Unexpected data found in events storage: ${JSON.stringify(e)}. Ignoring.`);
                return result;
            }
        }, []);
    }
    async prepareEventsPayload(pingName, pingData) {
        var _a, _b, _c, _d;
        let sortedEvents = pingData.sort((a, b) => {
            var _a, _b;
            const executionCounterA = Number((_a = a.get().extra) === null || _a === void 0 ? void 0 : _a[GLEAN_EXECUTION_COUNTER_EXTRA_KEY]);
            const executionCounterB = Number((_b = b.get().extra) === null || _b === void 0 ? void 0 : _b[GLEAN_EXECUTION_COUNTER_EXTRA_KEY]);
            if (executionCounterA !== executionCounterB) {
                return executionCounterA - executionCounterB;
            }
            return a.get().timestamp - b.get().timestamp;
        });
        let lastRestartDate;
        try {
            lastRestartDate = createDateObject((_a = sortedEvents[0].get().extra) === null || _a === void 0 ? void 0 : _a[GLEAN_REFERENCE_TIME_EXTRA_KEY]);
            sortedEvents.shift();
        }
        catch (_e) {
            lastRestartDate = Context.startTime;
        }
        const firstEventOffset = ((_b = sortedEvents[0]) === null || _b === void 0 ? void 0 : _b.get().timestamp) || 0;
        let restartedOffset = 0;
        for (const [index, event] of sortedEvents.entries()) {
            try {
                const nextRestartDate = createDateObject((_c = event.get().extra) === null || _c === void 0 ? void 0 : _c[GLEAN_REFERENCE_TIME_EXTRA_KEY]);
                const dateOffset = nextRestartDate.getTime() - lastRestartDate.getTime();
                lastRestartDate = nextRestartDate;
                const newRestartedOffset = restartedOffset + dateOffset;
                const previousEventTimestamp = sortedEvents[index - 1].get().timestamp;
                if (newRestartedOffset <= previousEventTimestamp) {
                    restartedOffset = previousEventTimestamp + 1;
                    await Context.errorManager.record(getGleanRestartedEventMetric([pingName]), ErrorType.InvalidValue, `Invalid time offset between application sessions found for ping "${pingName}". Ignoring.`);
                }
                else {
                    restartedOffset = newRestartedOffset;
                }
            }
            catch (_f) {
            }
            const executionCount = Number(((_d = event.get().extra) === null || _d === void 0 ? void 0 : _d[GLEAN_EXECUTION_COUNTER_EXTRA_KEY]) || 1);
            let adjustedTimestamp;
            if (executionCount === 1) {
                adjustedTimestamp = event.get().timestamp - firstEventOffset;
            }
            else {
                adjustedTimestamp = event.get().timestamp + restartedOffset;
            }
            sortedEvents[index] = new RecordedEvent({
                category: event.get().category,
                name: event.get().name,
                timestamp: adjustedTimestamp,
                extra: event.get().extra
            });
        }
        sortedEvents = removeTrailingRestartedEvents(sortedEvents);
        return sortedEvents.map((e) => e.payload());
    }
}
export default EventsDatabase;
