/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { BooleanMetricPayload, isBooleanMetricPayload } from "metrics/boolean";
import { isString } from "utils";

export function isMetricPayload(type: string, v: unknown): v is MetricPayload {
  switch (type) {
  case "boolean":
    return isBooleanMetricPayload(v);
  default:
    return isString(v);
  }
}

// Leaving the `string` as a valid metric payload here so that tests keep working for now.
export type MetricPayload = BooleanMetricPayload | string;

