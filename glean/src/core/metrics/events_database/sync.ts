/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type SynchronousStore from "../../storage/sync.js";
import type { Event } from "./recorded_event.js";
import type { JSONArray, JSONValue } from "../../utils.js";
import type MetricsDatabaseSync from "../database/sync.js";
import type ErrorManagerSync from "../../error/sync.js";
import type { InternalEventMetricType as EventMetricType } from "../types/event.js";

import { isUndefined } from "../../utils.js";
import log, { LoggingLevel } from "../../log.js";
import { Context } from "../../context.js";
import { RecordedEvent } from "./recorded_event.js";
import {
  EVENTS_PING_NAME,
  GLEAN_EXECUTION_COUNTER_EXTRA_KEY,
  GLEAN_REFERENCE_TIME_EXTRA_KEY
} from "../../constants.js";
import { ErrorType } from "../../error/error_type.js";
import {
  createDateObject,
  EVENT_DATABASE_LOG_TAG,
  getExecutionCounterMetric,
  getGleanRestartedEventMetric,
  removeTrailingRestartedEvents
} from "./shared.js";

/// UTILS ///
/**
 * Records a `glean.restarted` event metric.
 *
 * @param sendInPings The list of pings this metric is sent in.
 * @param time The time to record on the `#glean_reference_time` extra key. Defaults to `Context.startTime`.
 * @returns A promise that resolved once recording is complete.
 */
function recordGleanRestartedEvent(sendInPings: string[], time = Context.startTime): void {
  const metric = getGleanRestartedEventMetric(sendInPings);
  metric.record(
    {
      [GLEAN_REFERENCE_TIME_EXTRA_KEY]: time.toISOString()
    },
    // We manually add timestamp 0 here to make sure
    // this is going to be sorted as the first event of this execution always.
    0
  );
}

// See `IEventsDatabase` for method documentation.
export class EventsDatabaseSync {
  private eventsStore: SynchronousStore;
  private initialized = false;

  constructor() {
    this.eventsStore = new Context.platform.Storage("events") as SynchronousStore;
  }

  /// PUBLIC ///
  initialize(): void {
    if (this.initialized) {
      return;
    }

    const storeNames = this.getAvailableStoreNames();
    // Submit the events ping in case there are _any_ events unsubmitted from the previous run
    if (storeNames.includes(EVENTS_PING_NAME)) {
      const storedEvents = (this.eventsStore.get([EVENTS_PING_NAME]) as JSONArray) ?? [];
      if (storedEvents.length > 0) {
        Context.corePings.events.submit("startup");
      }
    }

    // Increment the execution counter for known stores.
    // !IMPORTANT! This must happen before any event is recorded for this run.
    getExecutionCounterMetric(storeNames).add(1);
    recordGleanRestartedEvent(storeNames);

    this.initialized = true;
  }

  record(metric: EventMetricType, value: RecordedEvent): void {
    if (metric.disabled) {
      return;
    }

    for (const ping of metric.sendInPings) {
      const executionCounter = getExecutionCounterMetric([ping]);

      let currentExecutionCount = (
        Context.metricsDatabase as MetricsDatabaseSync
      ).getMetric<number>(ping, executionCounter);
      // There might not be an execution counter stored in case:
      //
      // 1. The ping was already sent during this session and the events storage was cleared;
      // 2. No event has ever been recorded for this ping.
      if (!currentExecutionCount) {
        executionCounter.add(1);
        currentExecutionCount = 1;

        // Record the `glean.restarted` event,
        // this must **always** be the first event of any events list.
        recordGleanRestartedEvent([ping], new Date());
      }
      value.addExtra(GLEAN_EXECUTION_COUNTER_EXTRA_KEY, currentExecutionCount);

      let numEvents = 0;
      const transformFn = (v?: JSONValue): JSONArray => {
        const events: JSONArray = (v as JSONArray) ?? [];
        events.push(value.get());
        numEvents = events.length;
        return events;
      };

      this.eventsStore.update([ping], transformFn);
      if (ping === EVENTS_PING_NAME && numEvents >= Context.config.maxEvents) {
        Context.corePings.events.submit("max_capacity");
      }
    }
  }

  getEvents(ping: string, metric: EventMetricType): Event[] | undefined {
    const events = this.getAndValidatePingData(ping);
    if (events.length === 0) {
      return;
    }

    return (
      events
        // Only report events for the requested metric.
        .filter((e) => e.get().category === metric.category && e.get().name === metric.name)
        .map((e) => e.withoutReservedExtras())
    );
  }

  getPingEvents(ping: string, clearPingLifetimeData: boolean): JSONArray | undefined {
    const pingData = this.getAndValidatePingData(ping);

    if (clearPingLifetimeData && Object.keys(pingData).length > 0) {
      this.eventsStore.delete([ping]);
    }

    if (pingData.length === 0) {
      return;
    }

    const payload = this.prepareEventsPayload(ping, pingData);
    if (payload.length > 0) {
      return payload;
    }
  }

  clearAll(): void {
    this.eventsStore.delete([]);
  }

  /// PRIVATE ///
  private getAvailableStoreNames(): string[] {
    const data = this.eventsStore.get([]);
    if (isUndefined(data)) {
      return [];
    }

    return Object.keys(data);
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
  private getAndValidatePingData(ping: string): RecordedEvent[] {
    const data = this.eventsStore.get([ping]);
    if (isUndefined(data)) {
      return [];
    }

    // We expect arrays!
    if (!Array.isArray(data)) {
      log(
        EVENT_DATABASE_LOG_TAG,
        `Unexpected value found for ping ${ping}: ${JSON.stringify(data)}. Clearing.`,
        LoggingLevel.Error
      );
      this.eventsStore.delete([ping]);
      return [];
    }

    return data.reduce((result, e) => {
      try {
        const event = new RecordedEvent(e);
        return [...result, event];
      } catch {
        log(
          EVENT_DATABASE_LOG_TAG,
          `Unexpected data found in events storage: ${JSON.stringify(e)}. Ignoring.`
        );
        return result;
      }
    }, [] as RecordedEvent[]);
  }

  /**
   * Prepares the events payload.
   *
   * 1. Sorts event by execution counter and timestamp;
   * 2. Applies offset to events timestamps;
   * 3. Removes the first event if it is a `glean.restarted` event;
   * 4. Removes reserved extra keys and stringifies all extras values;
   * 5. Removes all trailing `glean.restarted` events (if they exists);
   *
   * @param pingName The name of the ping for which the payload is being prepared.
   * @param pingData An unsorted list of events.
   * @returns An array of sorted events.
   */
  private prepareEventsPayload(pingName: string, pingData: RecordedEvent[]): JSONArray {
    // Sort events by execution counter and by timestamp.
    let sortedEvents = pingData.sort((a, b) => {
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
      lastRestartDate = createDateObject(
        sortedEvents[0].get().extra?.[GLEAN_REFERENCE_TIME_EXTRA_KEY]
      );
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
        const nextRestartDate = createDateObject(
          event.get().extra?.[GLEAN_REFERENCE_TIME_EXTRA_KEY]
        );
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
          (Context.errorManager as ErrorManagerSync).record(
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

    // There is no additional context in trailing `glean.restarted` events, they can be removed.
    sortedEvents = removeTrailingRestartedEvents(sortedEvents);

    return sortedEvents.map((e) => e.payload());
  }
}

export default EventsDatabaseSync;
