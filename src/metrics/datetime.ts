/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Metric, { CommonMetricData } from "metrics";
import Glean from "glean";
import { isString } from "utils";
import TimeUnit, { timeUnitFromString, validateDateString, buildTruncatedDateString, dateStringToDateObject } from "metrics/time_unit";

export type DatetimeMetricPayload = string;

/**
 * Checks whether or not `v` is a valid datetime metric payload.
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is a valid boolean metric payload.
 */
export function isDatetimeMetricPayload(v: unknown): v is DatetimeMetricPayload {
  if (!isString(v)) {
    return false;
  }

  return validateDateString(v);
}

/**
 *  A datetime metric.
 *
 * Used to record an absolute date and time, such as the time the user first ran
 * the application.
 */
class DatetimeMetric extends Metric {
  timeUnit: TimeUnit;

  constructor(meta: CommonMetricData, timeUnit: string) {
    super("datetime", meta);

    this.timeUnit = timeUnitFromString(timeUnit);
  }

  /**
   * Sets the metric to a date/time which including the timezone offset.
   *
   * @param value Some Data value, with offset, to set the metric to.
   *              If none, the current local time is used.
   */
  async set(value?: Date): Promise<void> {
    if (!this.shouldRecord()) {
      return;
    }

    if (!value) {
      value = new Date();
    }

    await Glean.db.record(this, buildTruncatedDateString(value, this.timeUnit));
  }

  /**
   * **Test-only API**
   *
   * Gets the currently stored value as a Date object.
   *
   * This doesn't clear the stored value.
   *
   * # Note
   *
   * The Date object is not timezone aware and is always in **local** time.
   *
   * If the currently stored datetime is in a different timezone than local,
   * the resulting Date object will contain the relative local date to the recorded value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string): Promise<Date | undefined> {
    const recorded = await Glean.db.getMetric<DatetimeMetricPayload>(ping, this);
    return recorded ? dateStringToDateObject(recorded) : undefined;
  }

  /**
   * **Test-only API**
   *
   * Gets the currently stored value as a string.
   *
   * The precision of this value is truncated to the `timeUnit` precision.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValueAsString(ping: string): Promise<DatetimeMetricPayload | undefined> {
    return Glean.db.getMetric(ping, this);
  }
}

export default DatetimeMetric;
