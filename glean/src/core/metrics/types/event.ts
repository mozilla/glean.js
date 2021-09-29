/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { ExtraMap } from "../events_database/recorded_event.js";
import { MetricType } from "../index.js";
import { RecordedEvent } from "../events_database/recorded_event.js";
import { getMonotonicNow, isString, testOnly, truncateStringAtBoundaryWithError } from "../../utils.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.metrics.EventMetricType";
const MAX_LENGTH_EXTRA_KEY_VALUE = 100;

/**
 * An event metric.
 */
class EventMetricType<SpecificExtraMap extends ExtraMap = ExtraMap> extends MetricType {
  private allowedExtraKeys?: string[];

  constructor(meta: CommonMetricData, allowedExtraKeys?: string[]) {
    super("event", meta);
    this.allowedExtraKeys = allowedExtraKeys;
  }

  /**
   * An internal implemention of `record` that does not dispatch the recording task.
   *
   * # Important
   *
   * This is absolutely not meant to be used outside of Glean itself.
   * It may cause multiple issues because it cannot guarantee
   * that the recording of the metric will happen in order with other Glean API calls.
   *
   * @param instance The metric instance to record to.
   * @param extra optional. Used for events where additional richer context is needed.
   *        The maximum length for string values is 100 bytes.
   * @param timestamp The event timestamp, defaults to now.
   * @returns A promise that resolves once the event is recorded.
   */
  static async _private_recordUndispatched(
    instance: EventMetricType,
    extra?: ExtraMap,
    timestamp: number = getMonotonicNow()
  ): Promise<void> {
    if (!instance.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    // Truncate the extra keys, if needed.
    let truncatedExtra: ExtraMap | undefined = undefined;
    if (extra && instance.allowedExtraKeys) {
      truncatedExtra = {};
      for (const [name, value] of Object.entries(extra)) {
        if (instance.allowedExtraKeys.includes(name)) {
          if (isString(value)) {
            truncatedExtra[name] = await truncateStringAtBoundaryWithError(instance, value, MAX_LENGTH_EXTRA_KEY_VALUE);
          } else {
            truncatedExtra[name] = value;
          }
        } else {
          await Context.errorManager.record(instance, ErrorType.InvalidValue, `Invalid key index: ${name}`);
          continue;
        }
      }
    }

    return Context.eventsDatabase.record(
      instance,
      new RecordedEvent(
        instance.category,
        instance.name,
        timestamp,
        truncatedExtra,
      )
    );
  }

  /**
   * Record an event.
   *
   * @param extra optional. Used for events where additional richer context is needed.
   *        The maximum length for string values is 100 bytes.
   */
  record(extra?: SpecificExtraMap): void {
    const timestamp = getMonotonicNow();

    Context.dispatcher.launch(async () => {
      await EventMetricType._private_recordUndispatched(this, extra, timestamp);
    });
  }

  /**
   * Test-only API**
   *
   * Gets the currently stored events.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  @testOnly(LOG_TAG)
  async testGetValue(ping: string = this.sendInPings[0]): Promise<RecordedEvent[] | undefined> {
    let events: RecordedEvent[] | undefined;
    await Context.dispatcher.testLaunch(async () => {
      events = await Context.eventsDatabase.getEvents(ping, this);
    });
    return events;
  }
}

export default EventMetricType;
