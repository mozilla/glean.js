/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import type MetricsDatabaseSync from "../database/sync.js";

import { MetricType } from "../index.js";
import TimeUnit from "../../metrics/time_unit.js";
import { Context } from "../../context.js";
import { MetricValidationError } from "../metric.js";
import { Metric, MetricValidation } from "../metric.js";
import { isNumber, isObject, isString, testOnlyCheck } from "../../utils.js";

const LOG_TAG = "core.metrics.DatetimeMetricType";

/**
 * Builds the formatted timezone offset string from a given timezone.
 *
 * The format of the resulting string is `+02:00`.
 *
 * @param timezone A number representing the timezone offset to format,
 *                 this is expected to be in minutes.
 * @returns The formatted timezone offset string.
 */
export function formatTimezoneOffset(timezone: number): string {
  const offset = (timezone / 60) * -1;
  const sign = offset > 0 ? "+" : "-";
  const hours = Math.abs(offset).toString().padStart(2, "0");
  return `${sign}${hours}:00`;
}

export type DatetimeInternalRepresentation = {
  // The time unit of the metric type at the time of recording.
  timeUnit: TimeUnit;
  // This timezone should be the exact output of `Date.getTimezoneOffset`
  // and as such it should alwaye be in minutes.
  timezone: number;
  // This date string should be the exact output of `Date.toISOString`
  // and as such it is always in UTC.
  date: string;
};

export class DatetimeMetric extends Metric<DatetimeInternalRepresentation, string> {
  constructor(v: unknown) {
    super(v);
  }

  static fromDate(v: unknown, timeUnit: TimeUnit): DatetimeMetric {
    if (!(v instanceof Date)) {
      throw new MetricValidationError(`Expected Date object, got ${JSON.stringify(v)}`);
    }

    return new DatetimeMetric({
      timeUnit,
      timezone: v.getTimezoneOffset(),
      date: v.toISOString()
    });
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
    return new Date(this.inner.date);
  }

  private get timezone(): number {
    return this.inner.timezone;
  }

  private get timeUnit(): TimeUnit {
    return this.inner.timeUnit;
  }

  private get dateISOString(): string {
    return this.inner.date;
  }

  validate(v: unknown): MetricValidationResult {
    if (!isObject(v) || Object.keys(v).length !== 3) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected Glean datetime metric object, got ${JSON.stringify(v)}`
      };
    }

    const timeUnitVerification =
      "timeUnit" in v &&
      isString(v.timeUnit) &&
      Object.values(TimeUnit).includes(v.timeUnit as TimeUnit);
    const timezoneVerification = "timezone" in v && isNumber(v.timezone);
    const dateVerification =
      "date" in v && isString(v.date) && v.date.length === 24 && !isNaN(Date.parse(v.date));
    if (!timeUnitVerification || !timezoneVerification || !dateVerification) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Invalid property on datetime metric, got ${JSON.stringify(v)}`
      };
    }

    return { type: MetricValidation.Success };
  }

  /**
   * Gets this metrics value in its payload representation.
   *
   * For this metric, the payload is the timezone aware ISO date string truncated to the time unit
   * given at the time of recording.
   *
   * # Note
   *
   * The timezone of the final string is the timezone at the time of recording.
   *
   * @returns The metric value.
   */
  payload(): string {
    const extractedDateInfo = this.dateISOString.match(/\d+/g);
    if (!extractedDateInfo || extractedDateInfo.length < 0) {
      // This is impossible because the date is always validated before setting
      throw new Error("IMPOSSIBLE: Unable to extract date information from DatetimeMetric.");
    }
    const correctedDate = new Date(
      /* year */ parseInt(extractedDateInfo[0]),
      /* month */ parseInt(extractedDateInfo[1]) - 1,
      /* day */ parseInt(extractedDateInfo[2]),
      /* hour */ parseInt(extractedDateInfo[3]) - this.timezone / 60,
      /* minute */ parseInt(extractedDateInfo[4]),
      /* second */ parseInt(extractedDateInfo[5]),
      /* millisecond */ parseInt(extractedDateInfo[6])
    );

    const timezone = formatTimezoneOffset(this.timezone);
    const year = correctedDate.getFullYear().toString().padStart(2, "0");
    // `Date.prototype.getMonth` returns the month starting at 0.
    const month = (correctedDate.getMonth() + 1).toString().padStart(2, "0");
    const day = correctedDate.getDate().toString().padStart(2, "0");
    if (this.timeUnit === TimeUnit.Day) {
      return `${year}-${month}-${day}${timezone}`;
    }

    const hours = correctedDate.getHours().toString().padStart(2, "0");
    if (this.timeUnit === TimeUnit.Hour) {
      return `${year}-${month}-${day}T${hours}${timezone}`;
    }

    const minutes = correctedDate.getMinutes().toString().padStart(2, "0");
    if (this.timeUnit === TimeUnit.Minute) {
      return `${year}-${month}-${day}T${hours}:${minutes}${timezone}`;
    }

    const seconds = correctedDate.getSeconds().toString().padStart(2, "0");
    if (this.timeUnit === TimeUnit.Second) {
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezone}`;
    }

    const milliseconds = correctedDate.getMilliseconds().toString().padStart(3, "0");
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
 * Base implementation of the datetime metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the datetime metric type.
 */
export class InternalDatetimeMetricType extends MetricType {
  timeUnit: TimeUnit;

  constructor(meta: CommonMetricData, timeUnit: string) {
    super("datetime", meta, DatetimeMetric);
    this.timeUnit = timeUnit as TimeUnit;
  }

  /// SHARED ///
  set(value?: Date): void {
    if (Context.isPlatformSync()) {
      this.setSync(value);
    } else {
      this.setAsync(value);
    }
  }

  // TODO
  // JSDoc
  // Unit test
  // Verify this is working the same as before.
  private truncateDate(value?: Date) {
    if (!value) {
      value = new Date();
    }

    // We always save a milliseconds precision ISO string on the database,
    // regardless of the time unit. So we zero out information that
    // is not necessary for the current time unit of this metric.
    const truncatedDate = value;
    switch (this.timeUnit) {
    case TimeUnit.Day:
      truncatedDate.setMilliseconds(0);
      truncatedDate.setSeconds(0);
      truncatedDate.setMinutes(0);
      truncatedDate.setMilliseconds(0);
    case TimeUnit.Hour:
      truncatedDate.setMilliseconds(0);
      truncatedDate.setSeconds(0);
      truncatedDate.setMinutes(0);
    case TimeUnit.Minute:
      truncatedDate.setMilliseconds(0);
      truncatedDate.setSeconds(0);
    case TimeUnit.Second:
      truncatedDate.setMilliseconds(0);
    default:
      break;
    }

    return truncatedDate;
  }

  /// ASYNC ///
  setAsync(value?: Date) {
    Context.dispatcher.launch(() => this.setUndispatched(value));
  }

  /**
   * An implementation of `set` that does not dispatch the recording task.
   *
   * # Important
   *
   * This method should **never** be exposed to users.
   *
   * @param value The date we want to set to.
   */
  async setUndispatched(value?: Date): Promise<void> {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    const truncatedDate = this.truncateDate(value);
    try {
      const metric = DatetimeMetric.fromDate(truncatedDate, this.timeUnit);
      await Context.metricsDatabase.record(this, metric);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        await e.recordError(this);
      }
    }
  }

  /// SYNC ///
  setSync(value?: Date) {
    if (!this.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    const truncatedDate = this.truncateDate(value);
    try {
      const metric = DatetimeMetric.fromDate(truncatedDate, this.timeUnit);
      (Context.metricsDatabase as MetricsDatabaseSync).record(this, metric);
    } catch (e) {
      if (e instanceof MetricValidationError) {
        e.recordErrorSync(this);
      }
    }
  }

  /// TESTING ///
  /**
   * Test-only API
   *
   * Gets the currently stored value as a DatetimeMetric.
   *
   * This doesn't clear the stored value.
   *
   * @param ping The ping from which we want to retrieve this metrics value from.
   * @param fn The name of the function that is calling this function. Used for testing purposes.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  private async testGetValueAsDatetimeMetric(
    ping: string,
    fn: string
  ): Promise<DatetimeMetric | undefined> {
    if (testOnlyCheck(fn, LOG_TAG)) {
      let value: DatetimeInternalRepresentation | undefined;
      await Context.dispatcher.testLaunch(async () => {
        value = await Context.metricsDatabase.getMetric<DatetimeInternalRepresentation>(ping, this);
      });
      if (value) {
        return new DatetimeMetric(value);
      }
    }
  }

  async testGetValueAsString(ping: string = this.sendInPings[0]): Promise<string | undefined> {
    const metric = await this.testGetValueAsDatetimeMetric(ping, "testGetValueAsString");
    return metric ? metric.payload() : undefined;
  }

  async testGetValue(ping: string = this.sendInPings[0]): Promise<Date | undefined> {
    const metric = await this.testGetValueAsDatetimeMetric(ping, "testGetValue");
    return metric ? metric.date : undefined;
  }
}

/**
 * A datetime metric.
 *
 * Used to record an absolute date and time,
 * such as the time the user first ran the application.
 */
export default class {
  #inner: InternalDatetimeMetricType;

  constructor(meta: CommonMetricData, timeUnit: string) {
    this.#inner = new InternalDatetimeMetricType(meta, timeUnit);
  }

  /**
   * Set a datetime value, truncating it to the metric's resolution.
   *
   * @param value The Date value to set. If not provided, will record the current time.
   */
  set(value?: Date): void {
    this.#inner.set(value);
  }

  /**
   * Test-only API
   *
   * Gets the currently stored value as an ISO date string.
   *
   * This doesn't clear the stored value.
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValueAsString(
    ping: string = this.#inner.sendInPings[0]
  ): Promise<string | undefined> {
    return this.#inner.testGetValueAsString(ping);
  }

  /**
   * Test-only API
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
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.#inner.sendInPings[0]): Promise<Date | undefined> {
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
  async testGetNumRecordedErrors(
    errorType: string,
    ping: string = this.#inner.sendInPings[0]
  ): Promise<number> {
    return this.#inner.testGetNumRecordedErrors(errorType, ping);
  }
}
