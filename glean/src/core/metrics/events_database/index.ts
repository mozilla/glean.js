/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Store from "../../storage/index.js";
import type { JSONArray, JSONValue } from "../../utils.js";
import { isString } from "../../utils.js";
import { isUndefined } from "../../utils.js";
import { InternalEventMetricType as EventMetricType } from "../types/event.js";
import log, { LoggingLevel } from "../../log.js";
import { InternalCounterMetricType as CounterMetricType } from "../types/counter.js";
import { Lifetime } from "../lifetime.js";
import { Context } from "../../context.js";
import { generateReservedMetricIdentifiers } from "../database.js";
import type { ExtraValues , Event } from "./recorded_event.js";
import { RecordedEvent } from "./recorded_event.js";
import {
  GLEAN_EXECUTION_COUNTER_EXTRA_KEY,
  GLEAN_REFERENCE_TIME_EXTRA_KEY
} from "../../constants.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.Metric.EventsDatabase";

/**
 * Attempts to create a date object from a string.
 *
 * Throws if unsuccessful.
 *
 * @param str The string to generate a date from.
 * @returns The Date object created.
 */
function createDateObject(str?: ExtraValues): Date {
  if (!isString(str)) {
    str = "";
  }

  const date = new Date(str);
  // Date object will not throw errors when we attempt to create an invalid date.
  if (isNaN(date.getTime())) {
    throw new Error(`Error attempting to generate Date object from string: ${str}`);
  }
  return date;
}

/**
 * Creates an execution counter metric.
 *
 * @param sendInPings The list of pings this metric is sent in.
 * @returns A metric type instance.
 */
function getExecutionCounterMetric(sendInPings: string[]): CounterMetricType {
  return new CounterMetricType({
    ...generateReservedMetricIdentifiers("execution_counter"),
    sendInPings: sendInPings,
    lifetime: Lifetime.Ping,
    disabled: false
  });
}

/**
 * Creates an `glean.restarted` event metric.
 *
 * @param sendInPings The list of pings this metric is sent in.
 * @returns A metric type instance.
 */
export function getGleanRestartedEventMetric(sendInPings: string[]): EventMetricType {
  return new EventMetricType({
    category: "glean",
    name: "restarted",
    sendInPings: sendInPings,
    lifetime: Lifetime.Ping,
    disabled: false
  }, [ GLEAN_REFERENCE_TIME_EXTRA_KEY ]);
}

/**
 * Records a `glean.restarted` event metric.
 *
 * @param sendInPings The list of pings this metric is sent in.
 * @param time The time to record on the `#glean_reference_time` extra key. Defaults to `Context.startTime`.
 * @returns A promise that resolved once recording is complete.
 */
async function recordGleanRestartedEvent(
  sendInPings: string[],
  time = Context.startTime
): Promise<void> {
  const metric = getGleanRestartedEventMetric(sendInPings);
  await metric.recordUndispatched(
    {
      [GLEAN_REFERENCE_TIME_EXTRA_KEY]: time.toISOString()
    },
    // We manually add timestamp 0 here to make sure
    // this is going to be sorted as the first event of this execution always.
    0
  );
}

/**
 * The events database is an abstraction layer on top of the underlying storage.
 *
 * Event data is saved to the database in the following format:
 *
 * {
 *  "pingName": {
 *    [
 *      {
 *        "timestamp": 0,
 *        "category": "something",
 *        "name": "other",
 *        "extra": {...}
 *      },
 *      ...
 *    ]
 *  }
 * }
 *
 * Events only support `Ping` lifetime.
 */
class EventsDatabase {
  private eventsStore: Store;
  private initialized = false;

  constructor() {
    this.eventsStore = new Context.platform.Storage("events");
  }

  private async getAvailableStoreNames(): Promise<string[]> {
    const data = await this.eventsStore.get([]);
    if (isUndefined(data)) {
      return [];
    }

    return Object.keys(data);
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const storeNames = await this.getAvailableStoreNames();
    // Increment the execution counter for known stores.
    // !IMPORTANT! This must happen before any event is recorded for this run.
    await getExecutionCounterMetric(storeNames).addUndispatched(1);
    await recordGleanRestartedEvent(storeNames);

    this.initialized = true;
  }

  /**
   * Records a given event.
   *
   * @param metric The metric to record to.
   * @param value The value we want to record to the given metric.
   */
  async record(metric: EventMetricType, value: RecordedEvent): Promise<void> {
    if (metric.disabled) {
      return;
    }

    for (const ping of metric.sendInPings) {
      const executionCounter = getExecutionCounterMetric([ping]);

      let currentExecutionCount = await Context.metricsDatabase.getMetric<number>(ping, executionCounter);
      // There might not be an execution counter stored in case:
      //
      // 1. The ping was already sent during this session and the events storage was cleared;
      // 2. No event has ever been recorded for this ping.
      if (!currentExecutionCount) {
        await executionCounter.addUndispatched(1);
        currentExecutionCount = 1;

        // Record the `glean.restarted` event,
        // this must **always** be the first event of any events list.
        await recordGleanRestartedEvent([ping], new Date());
      }
      value.addExtra(GLEAN_EXECUTION_COUNTER_EXTRA_KEY, currentExecutionCount);

      const transformFn = (v?: JSONValue): JSONArray => {
        const existing: JSONArray = (v as JSONArray) ?? [];
        existing.push(value.get());
        return existing;
      };
      await this.eventsStore.update([ping], transformFn);
    }
  }

  /**
   * Gets the vector of currently stored events for the given event metric in
   * the given store.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   * @param metric the metric we're looking for.
   * @returns an array of `RecordedEvent` containing the found events or `undefined`
   *          if no recorded event was found.
   */
  async getEvents(
    ping: string,
    metric: EventMetricType
  ): Promise<Event[] | undefined> {
    const events = await this.getAndValidatePingData(ping);
    if (events.length === 0) {
      return;
    }

    return events
      // Only report events for the requested metric.
      .filter((e) => (e.get().category === metric.category) && (e.get().name === metric.name))
      .map(e => e.withoutReservedExtras());
  }

  /**
   * Helper function to validate and get a specific lifetime data
   * related to a ping from the underlying storage.
   *
   * # Note
   *
   * If the value in storage for any of the metrics in the ping is of an unexpected type,
   * the whole ping payload for that lifetime will be thrown away.
   *
   * @param ping The ping we want to get the data from
   * @returns The ping payload found for the given parameters or an empty object
   *          in case no data was found or the data that was found, was invalid.
   */
  private async getAndValidatePingData(ping: string): Promise<RecordedEvent[]> {
    const data = await this.eventsStore.get([ping]);
    if (isUndefined(data)) {
      return [];
    }

    // We expect arrays!
    if (!Array.isArray(data)) {
      log(
        LOG_TAG,
        `Unexpected value found for ping ${ping}: ${JSON.stringify(data)}. Clearing.`,
        LoggingLevel.Error
      );
      await this.eventsStore.delete([ping]);
      return [];
    }

    return data.reduce((result, e) => {
      try {
        const event = new RecordedEvent(e);
        return [...result, event];
      } catch {
        log(LOG_TAG, `Unexpected data found in events storage: ${JSON.stringify(e)}. Ignoring.`);
        return result;
      }
    }, [] as RecordedEvent[]);
  }

  /**
   * Gets all of the events related to a given ping.
   *
   * @param ping The name of the ping to retrieve.
   * @param clearPingLifetimeData Whether or not to clear the ping lifetime metrics retrieved.
   * @returns An object containing all the metrics recorded to the given ping,
   *          `undefined` in case the ping doesn't contain any recorded metrics.
   */
  async getPingEvents(ping: string, clearPingLifetimeData: boolean): Promise<JSONArray | undefined> {
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

  /**
   * Prepares the events payload.
   *
   * 1. Sorts event by execution counter and timestamp;
   * 2. Applies offset to events timestamps;
   * 3. Removes the first event if it is a `glean.restarted` event;
   * 4. Removes reserved extra keys and stringifies all extras values.
   *
   * @param pingName The name of the ping for which the payload is being prepared.
   * @param pingData An unsorted list of events.
   * @returns An array of sorted events.
   */
  private async prepareEventsPayload(
    pingName: string,
    pingData: RecordedEvent[]
  ): Promise<JSONArray> {
    // Sort events by execution counter and by timestamp.
    const sortedEvents = pingData.sort((a, b) => {
      const executionCounterA = Number(a.get().extra?.[GLEAN_EXECUTION_COUNTER_EXTRA_KEY]);
      const executionCounterB = Number(b.get().extra?.[GLEAN_EXECUTION_COUNTER_EXTRA_KEY]);
      // Sort by execution counter, in case they are different.
      if (executionCounterA !== executionCounterB) {
        return executionCounterA - executionCounterB;
      }

      // Sort by timestamp if events come from same execution.
      return a.get().timestamp - b.get().timestamp;
    });

    let lastRestartDate: Date;
    try {
      lastRestartDate = createDateObject(sortedEvents[0].get().extra?.[GLEAN_REFERENCE_TIME_EXTRA_KEY]);
      // Drop the first `restarted` event.
      sortedEvents.shift();
    } catch {
      // In the unlikely case that the first event was not a `glean.restarted` event,
      // let's rely on the start time of the current session.
      lastRestartDate = Context.startTime;
    }

    const firstEventOffset = sortedEvents[0]?.get().timestamp || 0;
    let restartedOffset = 0;
    for (const [index, event] of sortedEvents.entries()) {
      try {
        const nextRestartDate = createDateObject(event.get().extra?.[GLEAN_REFERENCE_TIME_EXTRA_KEY]);
        const dateOffset = nextRestartDate.getTime() - lastRestartDate.getTime();
        lastRestartDate = nextRestartDate;

        // Calculate the new offset since new restart.
        const newRestartedOffset = restartedOffset + dateOffset;

        // The restarted event is always timestamp 0,
        // so in order to guarantee event timestamps are always in ascending order,
        // the offset needs to be _at least_ larger than the previous timestamp.
        const previousEventTimestamp = sortedEvents[index - 1].get().timestamp;
        if (newRestartedOffset <= previousEventTimestamp) {
          // In case the new offset results in descending timestamps,
          // we increase the previous timestamp by one to make sure
          // timestamps keep increasing.
          restartedOffset = previousEventTimestamp + 1;
          await Context.errorManager.record(
            getGleanRestartedEventMetric([pingName]),
            ErrorType.InvalidValue,
            `Invalid time offset between application sessions found for ping "${pingName}". Ignoring.`
          );
        } else {
          restartedOffset = newRestartedOffset;
        }
      } catch {
        // Do nothing,
        // this is expected to fail in case the current event is not a `glean.restarted` event.
      }

      // Apply necessary offsets to timestamps:
      // 1. If it is the first execution, subtract the firstEventOffset;
      // 2. Otherwise add restartedOffset.

      // The execution counter is a counter metric, the smallest value it can have is `1`.
      // At this stage all metrics should have an execution counter, but out of caution we
      // will fallback to `1` in case it is not present.
      const executionCount = Number(event.get().extra?.[GLEAN_EXECUTION_COUNTER_EXTRA_KEY] || 1);
      let adjustedTimestamp: number;
      if (executionCount === 1) {
        adjustedTimestamp = event.get().timestamp - firstEventOffset;
      } else {
        adjustedTimestamp = event.get().timestamp + restartedOffset;
      }

      sortedEvents[index] = new RecordedEvent({
        category: event.get().category,
        name: event.get().name,
        timestamp: adjustedTimestamp,
        extra: event.get().extra
      });
    }

    return sortedEvents.map((e) => e.payload());
  }

  /**
   * Clears all persisted events data.
   */
  async clearAll(): Promise<void> {
    await this.eventsStore.delete([]);
  }
}

export default EventsDatabase;
