/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { v4 as UUIDv4, validate as UUIDvalidate } from "uuid";

import { KNOWN_CLIENT_ID } from "../../constants";
import { Metric, MetricType, CommonMetricData } from "metrics";
import { isString } from "utils";
import Glean from "glean";

/**
 * Generates a UUIDv4.
 *
 * Will provide a fallback in case `crypto` is not available,
 * which makes the "uuid" package generator not work.
 *
 * # Important
 *
 * This workaround is here for usage in Qt/QML environments, where `crypto` is not available.
 * Bug 1688015 was opened to figure out a less hacky way to do this.
 *
 * @returns A randomly generated UUIDv4.
 */
function generateUUIDv4(): string {
  if (typeof crypto !== "undefined") {
    return UUIDv4();
  } else {
    // Copied from https://stackoverflow.com/a/2117523/261698
    // and https://stackoverflow.com/questions/105034/how-to-create-guid-uuid
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

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
   * Sets to the specified value.
   *
   * @param value the value to set.
   *
   * @throws In case `value` is not a valid UUID.
   */
  set(value: string): void {
    if (!this.shouldRecord()) {
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

    this.dispatchRecordingTask(() => Glean.metricsDatabase.record(this, metric));
  }

  /**
   * Generates a new random uuid and sets the metric to it.
   *
   * @returns The generated value or `undefined` in case this metric shouldn't be recorded.
   */
  generateAndSet(): string | undefined {
    if (!this.shouldRecord()) {
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
   *
   * @returns The value found in storage or `undefined` if nothing was found.
   */
  async testGetValue(ping: string): Promise<string | undefined> {
    await this.testBlockOnRecordingTasks();
    return Glean.metricsDatabase.getMetric<string>(ping, this);
  }
}
 
export default UUIDMetricType;
