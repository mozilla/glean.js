import type { Event, ExtraValues, RecordedEvent } from "./recorded_event.js";
import type { JSONArray } from "../../utils.js";
import type { OptionalAsync } from "../../types.js";
import { InternalCounterMetricType as CounterMetricType } from "../types/counter.js";
import { InternalEventMetricType as EventMetricType } from "../types/event.js";
export declare const EVENT_DATABASE_LOG_TAG = "core.Metric.EventsDatabase";
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
export interface IEventsDatabase {
    initialize(): OptionalAsync<void>;
    /**
     * Records a given event.
     *
     * @param metric The metric to record to.
     * @param value The value we want to record to the given metric.
     */
    record(metric: EventMetricType, value: RecordedEvent): OptionalAsync<void>;
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
    getEvents(ping: string, metric: EventMetricType): OptionalAsync<Event[] | undefined>;
    /**
     * Gets all of the events related to a given ping.
     *
     * @param ping The name of the ping to retrieve.
     * @param clearPingLifetimeData Whether or not to clear the ping lifetime metrics retrieved.
     * @returns An object containing all the metrics recorded to the given ping,
     *          `undefined` in case the ping doesn't contain any recorded metrics.
     */
    getPingEvents(ping: string, clearPingLifetimeData: boolean): OptionalAsync<JSONArray | undefined>;
    /**
     * Clears all persisted events data.
     */
    clearAll(): OptionalAsync<void>;
}
/**
 * Attempts to create a date object from a string.
 *
 * Throws if unsuccessful.
 *
 * @param str The string to generate a date from.
 * @returns The Date object created.
 */
export declare function createDateObject(str?: ExtraValues): Date;
/**
 * Creates an execution counter metric.
 *
 * @param sendInPings The list of pings this metric is sent in.
 *        Note: The 'events' ping should not contain glean.restarted events,
 *        so this ping will be filtered out from the 'sendInPings' array.
 * @returns A metric type instance.
 */
export declare function getExecutionCounterMetric(sendInPings: string[]): CounterMetricType;
/**
 * Creates an `glean.restarted` event metric.
 *
 * @param sendInPings The list of pings this metric is sent in.
 *        Note: The 'events' ping should not contain glean.restarted events,
 *        so this ping will be filtered out from the 'sendInPings' array.
 * @returns A metric type instance.
 */
export declare function getGleanRestartedEventMetric(sendInPings: string[]): EventMetricType;
/**
 * Checks if the given event is a `glean.restarted` event.
 *
 * @param event The event to check.
 * @returns True if the event is a `glean.restarted` event, false otherwise.
 */
export declare function isRestartedEvent(event: RecordedEvent): boolean;
/**
 * Removes all trailing `glean.restarted` events. We will continue to check
 * the last element of the array until there are no longer any elements OR
 * the event is not a `glean.restarted` event.
 *
 * @param sortedEvents Before this is called, events should already be sorted
 *        which includes removing the leading `glean.restarted` event.
 * @returns The input array without any trailing `glean.restarted` events.
 */
export declare function removeTrailingRestartedEvents(sortedEvents: RecordedEvent[]): RecordedEvent[];
