/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Metric, LabeledMetric } from "./index";
import { JSONValue } from "../utils";

import { BooleanMetric } from "./types/boolean";
import { CounterMetric } from "./types/counter";
import { DatetimeMetric } from "./types/datetime";
import { StringMetric } from "./types/string";
import { UUIDMetric } from "./types/uuid";

/**
 * A map containing all supported internal metrics and its constructors.
 */
const METRIC_MAP: {
  readonly [type: string]: new (v: unknown) => Metric<JSONValue, JSONValue>
} = Object.freeze({
  "boolean": BooleanMetric,
  "counter": CounterMetric,
  "datetime": DatetimeMetric,
  "labeled_counter": LabeledMetric,
  "string": StringMetric,
  "uuid": UUIDMetric,
});

/**
 * A metric factory function.
 *
 * @param type The type of the metric to create.
 * @param v The value with which to instantiate the metric.
 *
 * @returns A metric instance.
 *
 * @throws
 * - In case type is not listed in the `METRIC_MAP`;
 * - In case `v` is not in the correct representation for the wanted metric type.
 */
export function createMetric(type: string, v: unknown): Metric<JSONValue, JSONValue> {
  if (!(type in METRIC_MAP)) {
    throw new Error(`Unable to create metric of unknown type ${type}`);
  }

  return new METRIC_MAP[type](v);
}

/**
 * Validates that a given value is in the correct
 * internal representation format for a metric of a given type.
 *
 * @param type The type of the metric to validate
 * @param v The value to verify
 *
 * @returns Whether or not `v` is of the correct type.
 */
export function validateMetricInternalRepresentation<T extends JSONValue>(
  type: string,
  v: unknown
): v is T {
  try {
    createMetric(type, v);
    return true;
  } catch {
    return false;
  }
}
