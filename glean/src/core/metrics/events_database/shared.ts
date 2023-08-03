/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Event, ExtraValues, RecordedEvent } from "./recorded_event.js";
import type { JSONArray } from "../../utils.js";
import type { OptionalAsync } from "../../types.js";

import { isString } from "../../utils.js";
import { InternalCounterMetricType as CounterMetricType } from "../types/counter.js";
import { generateReservedMetricIdentifiers } from "../database/shared.js";
import { EVENTS_PING_NAME, GLEAN_REFERENCE_TIME_EXTRA_KEY } from "../../constants.js";
import { Lifetime } from "../lifetime.js";
import { InternalEventMetricType as EventMetricType } from "../types/event.js";

export const EVENT_DATABASE_LOG_TAG = "core.Metric.EventsDatabase";

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
export function createDateObject(str?: ExtraValues): Date {
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
 *        Note: The 'events' ping should not contain glean.restarted events,
 *        so this ping will be filtered out from the 'sendInPings' array.
 * @returns A metric type instance.
 */
export function getExecutionCounterMetric(sendInPings: string[]): CounterMetricType {
  return new CounterMetricType({
    ...generateReservedMetricIdentifiers("execution_counter"),
    sendInPings: sendInPings.filter((name) => name !== EVENTS_PING_NAME),
    lifetime: Lifetime.Ping,
    disabled: false
  });
}

/**
 * Creates an `glean.restarted` event metric.
 *
 * @param sendInPings The list of pings this metric is sent in.
 *        Note: The 'events' ping should not contain glean.restarted events,
 *        so this ping will be filtered out from the 'sendInPings' array.
 * @returns A metric type instance.
 */
export function getGleanRestartedEventMetric(sendInPings: string[]): EventMetricType {
  return new EventMetricType(
    {
      category: "glean",
      name: "restarted",
      sendInPings: sendInPings.filter((name) => name !== EVENTS_PING_NAME),
      lifetime: Lifetime.Ping,
      disabled: false
    },
    [GLEAN_REFERENCE_TIME_EXTRA_KEY]
  );
}

/**
 * Checks if the given event is a `glean.restarted` event.
 *
 * @param event The event to check.
 * @returns True if the event is a `glean.restarted` event, false otherwise.
 */
export function isRestartedEvent(event: RecordedEvent): boolean {
  // This extra key will only exist for `glean.restarted` events. If at some
  // point that is no longer the case, this can be updated to check the event
  // `name` and `category` instead.
  return !!event?.get()?.extra?.[GLEAN_REFERENCE_TIME_EXTRA_KEY];
}

/**
 * Removes all trailing `glean.restarted` events. We will continue to check
 * the last element of the array until there are no longer any elements OR
 * the event is not a `glean.restarted` event.
 *
 * @param sortedEvents Before this is called, events should already be sorted
 *        which includes removing the leading `glean.restarted` event.
 * @returns The input array without any trailing `glean.restarted` events.
 */
export function removeTrailingRestartedEvents(sortedEvents: RecordedEvent[]): RecordedEvent[] {
  while (!!sortedEvents.length && isRestartedEvent(sortedEvents[sortedEvents.length - 1])) {
    sortedEvents.pop();
  }

  return sortedEvents;
}
