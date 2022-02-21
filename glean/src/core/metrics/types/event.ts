/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { ExtraMap } from "../events_database/recorded_event.js";
import { MetricType } from "../index.js";
import { RecordedEvent } from "../events_database/recorded_event.js";
import { getMonotonicNow, isString, testOnlyCheck, truncateStringAtBoundaryWithError } from "../../utils.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";

const LOG_TAG = "core.metrics.EventMetricType";
const MAX_LENGTH_EXTRA_KEY_VALUE = 100;

/**
 * Base implementation of the event metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the event metric type.
 */
export class InternalEventMetricType<SpecificExtraMap extends ExtraMap = ExtraMap> extends MetricType {
  private allowedExtraKeys?: string[];

  constructor(meta: CommonMetricData, allowedExtraKeys?: string[]) {
    super("event", meta);
    this.allowedExtraKeys = allowedExtraKeys;
  }

  /**
   * An implemention of `record` that does not dispatch the recording task.
   *
   * @param extra optional. Used for events where additional richer context is needed.
   *        The maximum length for string values is 100 bytes.
   * @param timestamp The event timestamp, defaults to now.
   * @returns A promise that resolves once the event is recorded.
   */
  async recordUndispatched(
    extra?: ExtraMap,
    timestamp: number = getMonotonicNow()
  ): Promise<void> {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    // Truncate the extra keys, if needed.
    let truncatedExtra: ExtraMap | undefined = undefined;
    if (extra && this.allowedExtraKeys) {
      truncatedExtra = {};
      for (const [name, value] of Object.entries(extra)) {
        if (this.allowedExtraKeys.includes(name)) {
          if (isString(value)) {
            truncatedExtra[name] = await truncateStringAtBoundaryWithError(this, value, MAX_LENGTH_EXTRA_KEY_VALUE);
          } else {
            truncatedExtra[name] = value;
          }
        } else {
          await Context.errorManager.record(this, ErrorType.InvalidValue, `Invalid key index: ${name}`);
          continue;
        }
      }
    }

    return Context.eventsDatabase.record(
      this,
      new RecordedEvent(
        this.category,
        this.name,
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
      await this.recordUndispatched(extra, timestamp);
    });
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
  async testGetValue(ping: string = this.sendInPings[0]): Promise<RecordedEvent[] | undefined> {
    if (testOnlyCheck("testGetValue", LOG_TAG)) {
      let events: RecordedEvent[] | undefined;
      await Context.dispatcher.testLaunch(async () => {
        events = await Context.eventsDatabase.getEvents(ping, this);
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
  async testGetValue(ping: string = this.#inner.sendInPings[0]): Promise<RecordedEvent[] | undefined> {
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
  async testGetNumRecordedErrors(errorType: string, ping: string = this.#inner.sendInPings[0]): Promise<number> {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}
