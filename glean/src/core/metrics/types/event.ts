/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { ExtraMap, Event } from "../events_database/recorded_event.js";

import { RecordedEvent } from "../events_database/recorded_event.js";
import { MetricType } from "../index.js";
import {
  getMonotonicNow,
  isString,
  testOnlyCheck,
  truncateStringAtBytesBoundaryWithError
} from "../../utils.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";
import { MetricValidationError } from "../metric.js";

const LOG_TAG = "core.metrics.EventMetricType";
const MAX_BYTES_EXTRA_KEY_VALUE = 500;

/**
 * Base implementation of the event metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the event metric type.
 */
export class InternalEventMetricType<
  SpecificExtraMap extends ExtraMap = ExtraMap
> extends MetricType {
  private allowedExtraKeys?: string[];

  constructor(meta: CommonMetricData, allowedExtraKeys?: string[]) {
    super("event", meta);
    this.allowedExtraKeys = allowedExtraKeys;
  }

  /**
   * Record an event.
   *
   * @param extra optional. Used for events where additional richer context is needed.
   *        The maximum length for string values is 100 bytes.
   * @param timestamp The event timestamp, defaults to now.
   */
  record(extra?: SpecificExtraMap, timestamp: number = getMonotonicNow()): void {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    const ts = Date.now();

    try {
      // Create metric here, in order to run the validations and throw in case input in invalid.
      const metric = new RecordedEvent({
        category: this.category,
        name: this.name,
        timestamp,
        extra
      });

      // Truncate the extra keys, if needed.
      const truncatedExtra: ExtraMap = {};
      if (extra && this.allowedExtraKeys) {
        for (const [name, value] of Object.entries(extra)) {
          if (this.allowedExtraKeys.includes(name)) {
            if (isString(value)) {
              truncatedExtra[name] = truncateStringAtBytesBoundaryWithError(
                this,
                value,
                MAX_BYTES_EXTRA_KEY_VALUE
              );
            } else {
              truncatedExtra[name] = value;
            }
          } else {
            Context.errorManager.record(
              this,
              ErrorType.InvalidValue,
              `Invalid key index: ${name}`
            );
            continue;
          }
        }
      }

      // Glean wall-clock timestamp added to all events
      truncatedExtra["glean_timestamp"] = ts.toString();
      metric.set({
        ...metric.get(),
        extra: truncatedExtra
      });

      Context.eventsDatabase.record(this, metric);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordError(this);
      }
    }
  }

  /// TESTING ///
  /**
   * Test-only API
   *
   * Gets the currently stored events.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  testGetValue(ping: string = this.sendInPings[0]): Event[] | undefined {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      const events = Context.eventsDatabase.getEvents(ping, this);
      if (!events) return events;

      events.forEach((ev) => {
        if (ev.extra) {
          delete ev.extra["glean_timestamp"];
          if (Object.keys(ev.extra).length == 0) {
            ev.extra = undefined;
          }
        }
      });

      return events;
    }
  }
}

/**
 * An event metric.
 */
export default class EventMetricType<SpecificExtraMap extends ExtraMap = ExtraMap> {
  #inner: InternalEventMetricType;

  constructor(meta: CommonMetricData, allowedExtraKeys?: string[]) {
    this.#inner = new InternalEventMetricType<SpecificExtraMap>(meta, allowedExtraKeys);
  }

  /**
   * Record an event.
   *
   * @param extra optional. Used for events where additional richer context is needed.
   *        The maximum length for string values is 100 bytes.
   */
  record(extra?: SpecificExtraMap): void {
    this.#inner.record(extra);
  }

  /**
   * Test-only API
   *
   * Gets the currently stored events.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  testGetValue(ping: string = this.#inner.sendInPings[0]): Event[] | undefined {
    return this.#inner.testGetValue(ping);
  }

  /**
   * Test-only API
   *
   * Returns the number of errors recorded for the given metric.
   *
   * @param errorType The type of the error recorded.
   * @param ping represents the name of the ping to retrieve the metric for.
   *        Defaults to the first value in `sendInPings`.
   * @returns the number of errors recorded for the metric.
   */
  testGetNumRecordedErrors(errorType: string, ping: string = this.#inner.sendInPings[0]): number {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}
