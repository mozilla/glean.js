/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { ExtraMap } from "../events_database.js";
import { MetricType } from "../index.js";
import { RecordedEvent } from "../events_database.js";
import { getMonotonicNow, truncateStringAtBoundaryWithError } from "../../utils.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";

const MAX_LENGTH_EXTRA_KEY_VALUE = 100;

/**
 * An event metric.
 */
class EventMetricType extends MetricType {
  private allowedExtraKeys?: string[];

  constructor(meta: CommonMetricData, allowedExtraKeys?: string[]) {
    super("event", meta);
    this.allowedExtraKeys = allowedExtraKeys;
  }

  /**
   * Record an event by using the information
   * provided by the instance of this class.
   *
   * @param extra optional. This is a map, both keys and values need to be
   *        strings, keys are identifiers. This is used for events where
   *        additional richer context is needed.
   *        The maximum length for values is 100 bytes.
   */
  record(extra?: ExtraMap): void {
    const timestamp = getMonotonicNow();

    Context.dispatcher.launch(async () => {
      if (!this.shouldRecord(Context.uploadEnabled)) {
        return;
      }

      // Truncate the extra keys, if needed.
      let truncatedExtra: ExtraMap | undefined = undefined;
      if (extra && this.allowedExtraKeys) {
        truncatedExtra = {};
        for (const [name, value] of Object.entries(extra)) {
          if (this.allowedExtraKeys.includes(name)) {
            truncatedExtra[name] = await truncateStringAtBoundaryWithError(this, value, MAX_LENGTH_EXTRA_KEY_VALUE);
          } else {
            await Context.errorManager.record(this, ErrorType.InvalidValue, `Invalid key index: ${name}`);
            continue;
          }
        }
      }

      const event = new RecordedEvent(
        this.category,
        this.name,
        timestamp,
        truncatedExtra,
      );
      await Context.eventsDatabase.record(this.disabled, this.sendInPings, event);
    });
  }

  /**
   * Test-only API**
   *
   * Gets the currently stored events.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.sendInPings[0]): Promise<RecordedEvent[] | undefined> {
    let events: RecordedEvent[] | undefined;
    await Context.dispatcher.testLaunch(async () => {
      events = await Context.eventsDatabase.getEvents(ping, this);
    });
    return events;
  }
}

export default EventMetricType;
