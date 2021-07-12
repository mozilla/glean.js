// /* This Source Code Form is subject to the terms of the Mozilla Public
//  * License, v. 2.0. If a copy of the MPL was not distributed with this
//  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Store from "../storage/index.js";
import type { JSONArray, JSONObject, JSONValue } from "../utils.js";
import type { StorageBuilder } from "../../platform/index.js";
import { isUndefined } from "../utils.js";
import EventMetricType from "./types/event.js";
import log, { LoggingLevel } from "../log.js";
import CounterMetricType from "./types/counter.js";
import { Lifetime } from "./lifetime.js";
import { Context } from "../context.js";
import { generateReservedMetricIdentifiers } from "./database.js";

const LOG_TAG = "core.Metric.EventsDatabase";

export const GLEAN_EXECUTION_COUNTER_EXTRA_KEY = "glean_execution_counter";
const GLEAN_STARTUP_DATE_EXTRA_KEY = "glean_startup_date";
const GLEAN_RESERVED_EXTRA_KEYS = [
  GLEAN_EXECUTION_COUNTER_EXTRA_KEY,
  GLEAN_STARTUP_DATE_EXTRA_KEY
];

/**
 * Attempts to create a date object from a string.
 *
 * Throws if unsuccesfull.
 *
 * @param str The string to generate a date from.
 * @returns The Date object created.
 */
function createDateObject(str = ""): Date {
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
function getGleanRestartedEvent(sendInPings: string[]): EventMetricType {
  return new EventMetricType({
    category: "glean",
    name: "restarted",
    sendInPings: sendInPings,
    lifetime: Lifetime.Ping,
    disabled: false
  }, [ GLEAN_STARTUP_DATE_EXTRA_KEY ]);
}

// An helper type for the 'extra' map.
export type ExtraMap = Record<string, string>;

// Represents the recorded data for a single event.
export class RecordedEvent {
  constructor(
    // The event's category.
    //
    // This is defined by users in the metrics file.
    readonly category: string,
    // The event's name.
    //
    // This is defined by users in the metrics file.
    readonly name: string,
    // The timestamp of when the event was recorded.
    //
    // This allows to order events.
    readonly timestamp: number,
    // A map of all extra data values.
    //
    // The set of allowed extra keys is defined by users in the metrics file.
    public extra?: ExtraMap,
  ) {}

  static toJSONObject(e: RecordedEvent): JSONObject {
    return {
      "category": e.category,
      "name": e.name,
      "timestamp": e.timestamp,
      "extra": e.extra,
    };
  }

  static fromJSONObject(e: JSONObject): RecordedEvent {
    return new RecordedEvent(
      e["category"] as string,
      e["name"] as string,
      e["timestamp"] as number,
      e["extra"] as ExtraMap | undefined
    );
  }

  /**
   * Add another extra key to a RecordedEvent object.
   *
   * @param key The key to add.
   * @param value The value of the key.
   */
  addExtra(key: string, value: string): void {
    if (!this.extra) {
      this.extra = {};
    }

    this.extra[key] = value;
  }

  /**
   * Generate a new RecordedEvent object,
   * stripped of Glean reserved extra keys.
   *
   * @returns A new RecordedEvent object.
   */
  withoutReservedExtras(): RecordedEvent {
    const extras = this.extra || {};
    const filteredExtras = Object.keys(extras)
      .filter(key => !GLEAN_RESERVED_EXTRA_KEYS.includes(key))
      .reduce((obj: ExtraMap, key) => {
        obj[key] = extras[key];
        return obj;
      }, {});

    return new RecordedEvent(
      this.category,
      this.name,
      this.timestamp,
      (filteredExtras && Object.keys(filteredExtras).length > 0) ? filteredExtras : undefined
    );
  }
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

  constructor(storage: StorageBuilder) {
    this.eventsStore = new storage("events");
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
    await CounterMetricType._private_addUndispatched(getExecutionCounterMetric(storeNames), 1);

    // Record the `glean.restarted` event.
    await EventMetricType._private_recordUndispatched(
      getGleanRestartedEvent(storeNames),
      {
        // TODO (bug 1693487): Remove the stringification once the new events API is implemented.
        [GLEAN_STARTUP_DATE_EXTRA_KEY]: Context.startTime.toISOString()
      },
      // We manually add timestamp 0 here to make sure
      // this is going to be sorted as the first event of this execution no matter what.
      0
    );

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

      let currentExecutionCount = await Context.metricsDatabase.getMetric(ping, executionCounter);
      // There might not be an execution counter stored
      // in case the ping was already sent during this session,
      // because in this case the ping storage will have been cleared.
      if (!currentExecutionCount) {
        await CounterMetricType._private_addUndispatched(executionCounter, 1);
        currentExecutionCount = 1;
      }
      // TODO (bug 1693487): Remove the stringification once the new events API is implemented.
      value.addExtra(GLEAN_EXECUTION_COUNTER_EXTRA_KEY, currentExecutionCount.toString());

      const transformFn = (v?: JSONValue): JSONArray => {
        const existing: JSONArray = (v as JSONArray) ?? [];
        existing.push(RecordedEvent.toJSONObject(value));
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
  ): Promise<RecordedEvent[] | undefined> {
    const events = await this.getAndValidatePingData(ping);
    if (events.length === 0) {
      return;
    }

    return events
      // Only report events for the requested metric.
      .filter((e) => (e.category === metric.category) && (e.name === metric.name))
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

    return data.map((e) => RecordedEvent.fromJSONObject((e as JSONObject)));
  }

  /**
   * Gets all of the events related to a given ping.
   *
   * @param ping The name of the ping to retrieve.
   * @param clearPingLifetimeData Whether or not to clear the ping lifetime metrics retrieved.
   * @param referenceTime The date/time to be considered as the "zero" time.
   *        Event timestamps after restarts, will be computed based on this time.
   * @returns An object containing all the metrics recorded to the given ping,
   *          `undefined` in case the ping doesn't contain any recorded metrics.
   */
  async getPingEvents(
    ping: string,
    clearPingLifetimeData: boolean,
    referenceTime: Date
  ): Promise<JSONArray | undefined> {
    const pingData = await this.getAndValidatePingData(ping);

    if (clearPingLifetimeData && Object.keys(pingData).length > 0) {
      await this.eventsStore.delete([ping]);
    }

    if (pingData.length === 0) {
      return;
    }

    const payload = this.prepareEventsPayload(pingData, referenceTime);
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
   * 4. Removes reserved extra keys.
   *
   * @param pingData An unsorted list of events.
   * @param referenceTime The date/time to be considered as the "zero" time.
   *        Event timestamps after restarts, will be computed based on this time.
   * @returns An array of sorted events.
   */
  private prepareEventsPayload(pingData: RecordedEvent[], referenceTime: Date): JSONArray {
    // Sort events by execution counter and by timestamp.
    const sortedEvents = pingData.sort((a, b) => {
      // TODO (bug 1693487): Remove the number casting once the new events API is implemented.
      const executionCounterA = Number(a.extra?.[GLEAN_EXECUTION_COUNTER_EXTRA_KEY]);
      const executionCounterB = Number(b.extra?.[GLEAN_EXECUTION_COUNTER_EXTRA_KEY]);
      // Sort by execution counter, in case they are different.
      if (executionCounterA !== executionCounterB) {
        return executionCounterA - executionCounterB;
      }

      // Sort by timestamp if events come from same execution.
      return a.timestamp - b.timestamp;
    });

    let lastRestartDate: Date;
    try {
      // If the first event is a `glean.restarted` event it has the startup date already.
      lastRestartDate = createDateObject(sortedEvents[0].extra?.[GLEAN_STARTUP_DATE_EXTRA_KEY]);
      // In case it is a `glean.restarted` event, remove it.
      sortedEvents.shift();
    } catch {
      lastRestartDate = referenceTime;
    }

    const firstEventOffset = sortedEvents[0]?.timestamp || 0;
    let restartedOffset = 0;
    sortedEvents.forEach((event, index) => {
      try {
        const nextRestartDate = createDateObject(event.extra?.[GLEAN_STARTUP_DATE_EXTRA_KEY]);
        const dateOffset = nextRestartDate.getTime() - lastRestartDate.getTime();
        lastRestartDate = nextRestartDate;

        // Update the current offset and move to the next event.
        restartedOffset += dateOffset;
      } catch {
        // Do nothing,
        // this is expected to fail in case the current event is not a `glean.restarted` event.
      }

      // Update the timestamp for the current event,
      // to account for the computed offset.
      sortedEvents[index] = new RecordedEvent(
        event.category,
        event.name,
        event.timestamp + restartedOffset - firstEventOffset,
        event.extra
      );
    });

    return sortedEvents.map((e) => RecordedEvent.toJSONObject(e.withoutReservedExtras()));
  }

  /**
   * Clears all persisted events data.
   */
  async clearAll(): Promise<void> {
    await this.eventsStore.delete([]);
  }
}

export default EventsDatabase;
