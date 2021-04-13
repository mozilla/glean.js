/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import TimeUnit from "../../metrics/time_unit.js";
import type { DatetimeInternalRepresentation} from "./datetime_metric.js";
import { DatetimeMetric } from "./datetime_metric.js";
import Dispatcher from "../../dispatcher.js";
import { Context } from "../../context.js";

/**
 * A datetime metric.
 *
 * Used to record an absolute date and time,
 * such as the time the user first ran the application.
 */
class DatetimeMetricType extends MetricType {
  timeUnit: TimeUnit;

  constructor(meta: CommonMetricData, timeUnit: string) {
    super("datetime", meta);
    this.timeUnit = timeUnit as TimeUnit;
  }

  /**
   * An internal implemention of `set` that does not dispatch the recording task.
   *
   * # Important
   *
   * This is absolutely not meant to be used outside of Glean itself.
   * It may cause multiple issues because it cannot guarantee
   * that the recording of the metric will happen in order with other Glean API calls.
   *
   * @param instance The metric instance to record to.
   * @param value The date we want to set to.
   */
  static async _private_setUndispatched(instance: DatetimeMetricType, value?: Date): Promise<void> {
    if (!instance.shouldRecord(Context.instance.uploadEnabled)) {
      return;
    }

    if (!value) {
      value = new Date();
    }

    // We always save a milliseconds precision ISO string on the database,
    // regardless of the time unit. So we zero out information that
    // is not necessary for the current time unit of this metric.
    const truncatedDate = value;
    switch(instance.timeUnit) {
    case (TimeUnit.Day):
      truncatedDate.setMilliseconds(0);
      truncatedDate.setSeconds(0);
      truncatedDate.setMinutes(0);
      truncatedDate.setMilliseconds(0);
    case (TimeUnit.Hour):
      truncatedDate.setMilliseconds(0);
      truncatedDate.setSeconds(0);
      truncatedDate.setMinutes(0);
    case (TimeUnit.Minute):
      truncatedDate.setMilliseconds(0);
      truncatedDate.setSeconds(0);
    case (TimeUnit.Second):
      truncatedDate.setMilliseconds(0);
    default:
      break;
    }

    const metric = DatetimeMetric.fromDate(value, instance.timeUnit);
    await Context.instance.metricsDatabase.record(instance, metric);
  }

  /**
   * Set a datetime value, truncating it to the metric's resolution.
   *
   * @param value The Date value to set. If not provided, will record the current time.
   */
  set(value?: Date): void {
    Dispatcher.instance.launch(() => DatetimeMetricType._private_setUndispatched(this, value));
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
    let value: DatetimeInternalRepresentation | undefined;
    await Dispatcher.instance.testLaunch(async () => {
      value = await Context.instance.metricsDatabase.getMetric<DatetimeInternalRepresentation>(ping, this);
    });
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
   *        Defaults to the first value in `sendInPings`.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValueAsString(ping: string = this.sendInPings[0]): Promise<string | undefined> {
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
   *        Defaults to the first value in `sendInPings`.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.sendInPings[0]): Promise<Date | undefined> {
    const metric = await this.testGetValueAsDatetimeMetric(ping);
    return metric ? metric.date : undefined;
  }
}

export default DatetimeMetricType;
