// /* This Source Code Form is subject to the terms of the Mozilla Public
//  * License, v. 2.0. If a copy of the MPL was not distributed with this
//  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Store } from "storage";
import WeakStore from "storage/weak";
import { MetricType } from "metrics";
import { isUndefined, JSONArray, JSONObject, JSONValue } from "utils";

export interface Metrics {
  [aMetricType: string]: {
    [aMetricIdentifier: string]: JSONValue
  }
}

// An helper type for the 'extra' map.
export type ExtraMap = { [name: string]: string };

// Represents the recorded data for a single event.
export class RecordedEvent {
  constructor(
    category: string,
    name: string,
    timestamp: number,
    extra?: ExtraMap,
  ) {
    this.category = category;
    this.name = name;
    this.timestamp = timestamp;
    this.extra = extra;
  }

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

  // The event's category.
  //
  // This is defined by users in the metrics file.
  readonly category: string;
  // The event's name.
  //
  // This is defined by users in the metrics file.
  readonly name: string;
  // The timestamp of when the event was recorded.
  //
  // This allows to order events.
  readonly timestamp: number;
  // A map of all extra data values.
  //
  // The set of allowed extra keys is defined by users in the metrics file.
  readonly extra?: ExtraMap;
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

  constructor() {
    this.eventsStore = new WeakStore("unused");
  }

  /**
   * Records a given event.
   *
   * @param metric The metric to record to.
   * @param value The value we want to record to the given metric.
   */
  async record(metric: MetricType, value: RecordedEvent): Promise<void> {
    if (metric.disabled) {
      return;
    }

    for (const ping of metric.sendInPings) {
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
   * 
   * @returns an array of `RecordedEvent` containing the found events or `undefined`
   *          if no recorded event was found.
   */
  async testGetValue(
    ping: string,
    metric: MetricType
  ): Promise<RecordedEvent[] | undefined> {
    const value = await this.eventsStore.get([ping]);
    if (!value) {
      return undefined;
    }

    const rawEvents = value as JSONArray;
    return rawEvents
      // Only report events for the requested metric.
      .filter((e) => {
        const rawEventObj = e as JSONObject;
        return (rawEventObj["category"] === metric.category)
          && (rawEventObj["name"] === metric.name);
      })
      // Convert them to `RecordedEvent`s.
      .map((e) => {
        return RecordedEvent.fromJSONObject(e as JSONObject);
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
   *
   * @returns The ping payload found for the given parameters or an empty object
   *          in case no data was found or the data that was found, was invalid.
   */
  private async getAndValidatePingData(ping: string): Promise<JSONArray> {
    const data = await this.eventsStore.get([ping]);
    if (isUndefined(data)) {
      return [];
    }

    // We expect arrays!
    if (!Array.isArray(data)) {
      console.error(`Unexpected value found for ping ${ping}: ${JSON.stringify(data)}. Clearing.`);
      await this.eventsStore.delete([ping]);
      return [];
    }

    return data;
  }

  /**
   * Gets all of the persisted metrics related to a given ping.
   *
   * @param ping The name of the ping to retrieve.
   * @param clearPingLifetimeData Whether or not to clear the ping lifetime metrics retrieved.
   *
   * @returns An object containing all the metrics recorded to the given ping,
   *          `undefined` in case the ping doesn't contain any recorded metrics.
   */
  async getPingMetrics(ping: string, clearPingLifetimeData: boolean): Promise<JSONArray | undefined> {
    const pingData = await this.getAndValidatePingData(ping);

    if (clearPingLifetimeData) {
      await this.eventsStore.delete([ping]);
    }

    if (pingData.length === 0) {
      return;
    }

    // Sort the events by their timestamp.
    const sortedData = pingData.sort((a, b) => {
      const objA = a as unknown as RecordedEvent;
      const objB = b as unknown as RecordedEvent;
      return objA["timestamp"] - objB["timestamp"];
    });

    // Make all the events relative to the first one.
    const firstTimestamp =
      (sortedData[0] as unknown as RecordedEvent)["timestamp"];

    return sortedData.map((e) => {
      const objE = e as JSONObject;
      const timestamp = (objE["timestamp"] as number) ?? 0;
      objE["timestamp"] = timestamp - firstTimestamp;
      return objE; 
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
