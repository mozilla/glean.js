/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Metric, MetricType, CommonMetricData } from "metrics";
import TimeUnit from "metrics/time_unit";
import Glean from "glean";
import { isNumber, isObject, isString } from "utils";

/**
 * Builds the formatted timezone offset string frim a given timezone.
 *
 * The format of the resulting string is `+02:00`.
 *
 * @param timezone A number representing the timezone offset to format,
 *                 this is expected to be in minutes.
 *
 * @returns The formatted timezone offset string.
 */
function formatTimezoneOffset(timezone: number): string {
  const offset = (timezone / 60) * -1;
  const sign = offset > 0 ? "+" : "-";
  const hours = Math.abs(offset).toString().padStart(2, "0");
  return `${sign}${hours}:00`;
}

type DatetimeInternalRepresentation = {
  // The time unit of the metric type at the time of recording.
  timeUnit: TimeUnit,
  // This timezone should be the exact output of `Date.getTimezoneOffset`
  // and as such it should alwaye be in minutes.
  timezone: number,
  // This date string should be the exact output of `Date.toISOString`
  // and as such it is always in UTC.
  date: string,
}

export class DatetimeMetric extends Metric<DatetimeInternalRepresentation, string> {
  constructor(v: unknown) {
    super(v);
  }

  /**
   * Gets the datetime data as a Date object.
   *
   * # Note
   *
   * The object created here will be relative to local time.
   * If the timezone at the time of recording is different,
   * the timezone offset will be applied before transforming to an object.
   *
   * @returns A date object.
   */
  get date(): Date {
    return new Date(this._inner.date);
  }

  private get timezone(): number {
    return this._inner.timezone;
  }

  private get timeUnit(): TimeUnit {
    return this._inner.timeUnit;
  }

  validate(v: unknown): v is DatetimeInternalRepresentation {
    if (!isObject(v) || Object.keys(v).length !== 3) {
      return false;
    }

    const timeUnitVerification = "timeUnit" in v && isString(v.timeUnit) && Object.values(TimeUnit).includes(v.timeUnit as TimeUnit);
    const timezoneVerification = "timezone" in v && isNumber(v.timezone);
    const dateVerification = "date" in v && isString(v.date) && v.date.length === 24 && !isNaN(Date.parse(v.date));
    if (!timeUnitVerification || !timezoneVerification || !dateVerification) {
      return false;
    }

    return true;
  }

  /**
   * Gets this metrics value in its payload representation.
   *
   * For this metric, the payload is the timezone aware ISO date string truncated to the time unit
   * given at the time of recording.
   *
   * @returns The metric value.
   */
  payload(): string {
    const timezone = formatTimezoneOffset(this.timezone);

    const year = this.date.getFullYear().toString().padStart(2, "0");
    const month = this.date.getMonth().toString().padStart(2, "0");
    const day = this.date.getDate().toString().padStart(2, "0");
    if (this.timeUnit === TimeUnit.Day) {
      return `${year}-${month}-${day}${timezone}`;
    }

    const hours = this.date.getHours().toString().padStart(2, "0");
    if (this.timeUnit === TimeUnit.Hour) {
      return `${year}-${month}-${day}T${hours}${timezone}`;
    }

    const minutes = this.date.getMinutes().toString().padStart(2, "0");
    if (this.timeUnit === TimeUnit.Minute) {
      return `${year}-${month}-${day}T${hours}:${minutes}${timezone}`;
    }

    const seconds = this.date.getSeconds().toString().padStart(2, "0");
    if (this.timeUnit === TimeUnit.Second) {
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`;
    }

    const milliseconds = this.date.getMilliseconds().toString().padStart(3, "0");
    if (this.timeUnit === TimeUnit.Millisecond) {
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${timezone}`;
    }

    if (this.timeUnit === TimeUnit.Microsecond) {
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}000${timezone}`;
    }

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}000000${timezone}`;
  }
}

/**
 * A datetime metric.
 *
 * Used to record an absolute date and time,
 * such as the time the user first ran the application.
 */
class DatetimeMetricType extends MetricType {
  private timeUnit: TimeUnit;

  constructor(meta: CommonMetricData, timeUnit: string) {
    super("datetime", meta);
    this.timeUnit = timeUnit as TimeUnit;
  }

  /**
   * Set a datetime value.
   *
   * # Note
   *
   * This value will be truncated to this metric's resolution at the time of submission.
   *
   * @param value The Date value to set. If not provided, will record the current time.
   */
  async set(value?: Date): Promise<void> {
    if (!this.shouldRecord()) {
      return;
    }

    if (!value) {
      value = new Date();
    }

    const metric =  new DatetimeMetric({
      timeUnit: this.timeUnit,
      timezone: value.getTimezoneOffset(),
      date: value.toISOString(),
    });
    await Glean.db.record(this, metric);
  }

  /**
   * **Test-only and private API**
   *
   * Gets the currently stored value as a DatetimeMetric.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  private async testGetValueAsDatetimeMetric(ping: string): Promise<DatetimeMetric | undefined> {
    const value = await Glean.db.getMetric<DatetimeInternalRepresentation>(ping, this);
    if (value) {
      return new DatetimeMetric(value);
    }
  }

  /**
   * **Test-only API**
   *
   * Gets the currently stored value as an ISO date string.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on   test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValueAsString(ping: string): Promise<string | undefined> {
    const metric = await this.testGetValueAsDatetimeMetric(ping);
    return metric ? metric.payload() : undefined;
  }

  /**
   * **Test-only API**
   *
   * Gets the currently stored value as a boolean.
   *
   * This doesn't clear the stored value.
   *
   * # Note
   *
   * The Date object is always in **local** time.
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
    const metric = await this.testGetValueAsDatetimeMetric(ping);
    return metric ? metric.date : undefined;
  }
}

export default DatetimeMetricType;
