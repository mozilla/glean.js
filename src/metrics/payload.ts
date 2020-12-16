/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { BooleanMetricPayload, isBooleanMetricPayload } from "metrics/boolean";
import { StringMetricPayload, isStringMetricPayload } from "metrics/string";

/**
 * Validates that a given value is the correct type of payload for a metric of a given type.
 *
 * @param type The type of the metric to validate
 * @param v The value to verify
 *
 * @returns Whether or not `v` is of the correct type.
 */
export function isMetricPayload(type: string, v: unknown): v is MetricPayload {
  switch (type) {
  case "boolean":
    return isBooleanMetricPayload(v);
  case "string":
    return isStringMetricPayload(v);
  default:
    return false;
  }
}

// Leaving the `string` as a valid metric payload here so that tests keep working for now.
export type MetricPayload =
  BooleanMetricPayload |
  StringMetricPayload;

