/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import { MetricType } from "../index.js";
import Glean from "../../glean.js";
import { MAX_LENGTH_VALUE, StringMetric } from "./string_metric.js";
import Dispatcher from "../../dispatcher.js";

/**
 * A string metric.
 *
 * Record an Unicode string value with arbitrary content.
 * Strings are length-limited to `MAX_LENGTH_VALUE` bytes.
 */
class StringMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("string", meta);
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
   * @param value The string we want to set to.
   */
  static async _private_setUndispatched(instance: StringMetricType, value: string): Promise<void> {
    if (!instance.shouldRecord(Glean.isUploadEnabled())) {
      return;
    }

    if (value.length > MAX_LENGTH_VALUE) {
      // TODO: record error once Bug 1682574 is resolved.
      console.warn(`String ${value} is longer than ${MAX_LENGTH_VALUE} chars. Truncating.`);
    }

    const metric = new StringMetric(value.substr(0, MAX_LENGTH_VALUE));
    await Glean.metricsDatabase.record(instance, metric);
  }

  /**
   * Sets to the specified string value.
   *
   * # Note
   *
   * Truncates the value if it is longer than `MAX_STRING_LENGTH` bytes
   * and logs an error.
   *
   * @param value the value to set.
   */
  set(value: string): void {
    Dispatcher.instance.launch(() => StringMetricType._private_setUndispatched(this, value));
  }

  /**
   * **Test-only API**
   *
   * Gets the currently stored value as a string.
   *
   * This doesn't clear the stored value.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param ping the ping from which we want to retrieve this metrics value from.
   *        Defaults to the first value in `sendInPings`.
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string = this.sendInPings[0]): Promise<string | undefined> {
    let metric: string | undefined;
    await Dispatcher.instance.testLaunch(async () => {
      metric = await Glean.metricsDatabase.getMetric<string>(ping, this);
    });
    return metric;
  }
}

export default StringMetricType;
