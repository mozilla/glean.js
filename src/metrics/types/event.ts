/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { MetricType, CommonMetricData } from "metrics";
import Glean from "glean";
import { ExtraMap, RecordedEvent } from "metrics/events_database";
import { isUndefined } from "utils";

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
   * An helper function to aid mocking the time in tests.
   *
   * This is only meant to be overridden in tests.
   * 
   * @returns the number of milliseconds since the time origin.
   */
  protected getMonotonicNow(): number {
    // Sadly, `performance.now` is not available outside of browsers, which
    // means we should get creative to find a proper clock. Fall back to `Date.now`
    // for now, until bug 1690528 is fixed.
    const now = isUndefined(performance) ? Date.now() : performance.now();
    return Math.round(now / 1000);
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
    Glean.dispatcher.launch(async () => {
      if (!this.shouldRecord()) {
        return;
      }
  
      const timestamp = this.getMonotonicNow();

      // Truncate the extra keys, if needed.
      let truncatedExtra: ExtraMap | undefined = undefined;
      if (extra && this.allowedExtraKeys) {
        truncatedExtra = {};
        for (const [name, value] of Object.entries(extra)) {
          if (this.allowedExtraKeys.includes(name)) {
            truncatedExtra[name] = value.substr(0, MAX_LENGTH_EXTRA_KEY_VALUE);
          } else {
            // TODO: bug 1682574 - record an error.
            console.error(`Invalid key index ${name}`);
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
      await Glean.eventsDatabase.record(this, event);
    });
  }

  /**
   * **Test-only API**
   *
   * Gets the currently stored events.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping?: string): Promise<RecordedEvent[] | undefined> {
    const pingToQuery = ping ?? this.sendInPings[0];
    const events = await Glean.eventsDatabase.getEvents(pingToQuery, this);
    if (!events) {
      return undefined;
    }

    return events;
  }
}

export default EventMetricType;
