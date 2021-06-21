// /* This Source Code Form is subject to the terms of the Mozilla Public
//  * License, v. 2.0. If a copy of the MPL was not distributed with this
//  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Store from "../storage/index.js";
import type { JSONArray, JSONObject, JSONValue } from "../utils.js";
import { isUndefined } from "../utils.js";
import type EventMetricType from "./types/event.js";
import type { StorageBuilder } from "../../platform/index.js";
import log, { LoggingLevel } from "../log.js";
import CounterMetricType from "./types/counter.js";
import { Context } from "../context.js";
import { Lifetime } from "./lifetime.js";
import { PING_INFO_STORAGE } from "../constants.js";
import { DatetimeMetric } from "./types/datetime.js";
import TimeUnit from "./time_unit.js";

const LOG_TAG = "core.Metric.EventsDatabase";

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
    readonly extra?: ExtraMap,
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

  constructor(storage: StorageBuilder) {
    this.eventsStore = new storage("events");
  }

  async initialize() {
    const stores = await this.getAvailableStoreNames();
    for (const storeName of stores) {
      const executionCounter = new CounterMetricType({
        category: "",
        name: `${storeName}#execution_counter`,
        sendInPings: [PING_INFO_STORAGE],
        lifetime: Lifetime.Ping,
        disabled: false
      });

      await CounterMetricType._private_addUndispatched(executionCounter, 1);
      const currentExecutionCount =
        await Context.metricsDatabase.getMetric(PING_INFO_STORAGE, executionCounter) ?? 1;

      // Get the start date with a the minute resolution.
      const startTime = DatetimeMetric.fromDate(Context.startTime, TimeUnit.Minute);

      // Inject a "glean.restarted" event in all the known stores.
      const event = new RecordedEvent(
        "glean",
        "restarted",
        0,
        {
          "gleanStartupDate": startTime.payload(),
          // TODO: Fixme, remove the stringification once the new events API
          // is implemented.
          "gleanExecutionCounter": currentExecutionCount.toString()
        },
      );
      await this.record(false, [storeName], event);
    }
  }

  /**
   * Records a given event.
   *
   * @param isDisabled Whether or not the metric is disabled.
   * @param sendInPings The list of pings to record the event to.
   * @param value The value we want to record to the given metric.
   */
  async record(isDisabled: boolean, sendInPings: string[], value: RecordedEvent): Promise<void> {
    if (isDisabled) {
      return;
    }

    for (const ping of sendInPings) {
      // Add an execution counter to all the recorded events.
      const executionCounter = new CounterMetricType({
        category: "",
        name: `${ping}#execution_counter`,
        sendInPings: [PING_INFO_STORAGE],
        lifetime: Lifetime.Ping,
        disabled: false
      });

      // Note that, at this point, we should always have a valid value stored
      // for the execution counter. But let's err on the side of caution and
      // use 1 if that's not the case.
      const currentExecutionCount =
        await Context.metricsDatabase.getMetric(PING_INFO_STORAGE, executionCounter) ?? 1;

      const rawEventObject = RecordedEvent.toJSONObject(value);
      if (rawEventObject["extra"]) {
        // TODO: Fixme, remove the stringification once the new events API
        // is implemented.
        (rawEventObject["extra"] as JSONObject)["gleanExecutionCounter"] = currentExecutionCount.toString();
      } else {
        rawEventObject["extra"] =
        {
          // TODO: Fixme, remove the stringification once the new events API
          // is implemented.
          "gleanExecutionCounter": currentExecutionCount.toString()
        }
      }

      const transformFn = (v?: JSONValue): JSONArray => {
        const existing: JSONArray = (v as JSONArray) ?? [];
        existing.push(rawEventObject);
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
      .filter((e) => {
        return (e.category === metric.category) && (e.name === metric.name);
      });
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

    return data.map((e) => RecordedEvent.fromJSONObject(e as JSONObject));
  }

  private async getAvailableStoreNames(): Promise<string[]> {
    const data = await this.eventsStore.get([]);
    if (isUndefined(data)) {
      return [];
    }

    return Object.keys(data);
  }

  /**
   * Gets all of the persisted metrics related to a given ping.
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

    // Sort the events by their timestamp.
    const sortedData = pingData.sort((a, b) => {
      return a.timestamp - b.timestamp;
    });

    // Make all the events relative to the first one.
    const firstTimestamp = sortedData[0].timestamp;

    return sortedData.map((e) => {
      const adjusted = RecordedEvent.toJSONObject(e);
      adjusted["timestamp"] = e.timestamp - firstTimestamp;
      return adjusted;
    });
  }

  /**
   * Clears all persisted events data.
   */
  async clearAll(): Promise<void> {
    await this.eventsStore.delete([]);
  }
}

export default EventsDatabase;
