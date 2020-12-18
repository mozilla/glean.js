/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { BooleanMetricPayload, isBooleanMetricPayload } from "metrics/boolean";
import { CounterMetricPayload, isCounterMetricPayload } from "metrics/counter";
import { StringMetricPayload, isStringMetricPayload } from "metrics/string";
import { UUIDMetricPayload, isUUIDMetricPayload } from "metrics/uuid";

/**
 * Validates that a given value is the correct type of payload for a metric of a given type.
 *
 * @param type The type of the metric to validate
 * @param v The value to verify
 *
 * @returns Whether or not `v` is of the correct type.
 */
export function isMetricPayload<T>(type: string, v: unknown): v is T {
  switch (type) {
  case "boolean":
    return isBooleanMetricPayload(v);
  case "counter":
    return isCounterMetricPayload(v);
  case "string":
    return isStringMetricPayload(v);
  case "uuid":
    return isUUIDMetricPayload(v);
  default:
    return false;
  }
}

// Leaving the `string` as a valid metric payload here so that tests keep working for now.
export type MetricPayload =
  BooleanMetricPayload |
  CounterMetricPayload |
  StringMetricPayload |
  UUIDMetricPayload;

