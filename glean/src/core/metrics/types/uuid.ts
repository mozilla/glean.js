/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { validate as UUIDvalidate } from "uuid";

import { KNOWN_CLIENT_ID } from "../../constants.js";
import { MetricType, CommonMetricData } from "../index.js";
import { Metric } from "../metric.js";
import { isString, generateUUIDv4 } from "../../utils.js";
import Glean from "../../glean.js";

export class UUIDMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is string {
    if (!isString(v)) {
      return false;
    }

    if (v === KNOWN_CLIENT_ID) {
      return true;
    }

    return UUIDvalidate(v);
  }

  payload(): string {
    return this._inner;
  }
}

/**
 *  An UUID metric.
 *
 * Stores UUID v4 (randomly generated) values.
 */
class UUIDMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("uuid", meta);
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
   * @param value The UUID we want to set to.
   */
  static async _private_setUndispatched(instance: UUIDMetricType, value: string): Promise<void> {
    if (!instance.shouldRecord(Glean.isUploadEnabled())) {
      return;
    }

    if (!value) {
      value = generateUUIDv4();
    }

    let metric: UUIDMetric;
    try {
      metric = new UUIDMetric(value);
    } catch {
      // TODO: record error once Bug 1682574 is resolved.
      console.warn(`"${value}" is not a valid UUID. Ignoring`);
      return;
    }

    await Glean.metricsDatabase.record(instance, metric);
  }

  /**
   * Sets to the specified value.
   *
   * @param value the value to set.
   *
   * @throws In case `value` is not a valid UUID.
   */
  set(value: string): void {
    Glean.dispatcher.launch(() => UUIDMetricType._private_setUndispatched(this, value));
  }

  /**
   * Generates a new random uuid and sets the metric to it.
   *
   * @returns The generated value or `undefined` in case this metric shouldn't be recorded.
   */
  generateAndSet(): string | undefined {
    if (!this.shouldRecord(Glean.isUploadEnabled())) {
      return;
    }

    const value = generateUUIDv4();
    this.set(value);

    return value;
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
    await Glean.dispatcher.testLaunch(async () => {
      metric = await Glean.metricsDatabase.getMetric<string>(ping, this);
    });
    return metric;
  }
}
 
export default UUIDMetricType;
