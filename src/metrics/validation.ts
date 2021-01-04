/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Metric } from "metrics";
import { JSONValue } from "utils";

import { BooleanMetric } from "metrics/boolean";
import { CounterMetric } from "metrics/counter";
import { StringMetric } from "metrics/string";
import { UUIDMetric } from "metrics/uuid";

/**
 * A map containing all supported internal metrics and its constructors.
 */
const METRIC_MAP: {
  readonly [type: string]: new (v: unknown) => Metric<JSONValue, JSONValue>
} = Object.freeze({
  "boolean": BooleanMetric,
  "counter": CounterMetric,
  "string": StringMetric,
  "uuid": UUIDMetric,
});

/**
 * Validates that a given value is in the correct
 * internal representation format for a metric of a given type.
 *
 * @param type The type of the metric to validate
 * @param v The value to verify
 *
 * @returns Whether or not `v` is of the correct type.
 */
export default function validateMetricInternalRepresentation<T extends JSONValue>(
  type: string,
  v: unknown
): v is T {
  if (!(type in METRIC_MAP)) {
    return false;
  }

  try {
    new METRIC_MAP[type](v);
    return true;
  } catch {
    return false;
  }
}
