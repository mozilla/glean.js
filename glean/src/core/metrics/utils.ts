/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import type { Metric } from "./metric.js";
import type { JSONValue } from "../utils.js";

import { LabeledMetric } from "./types/labeled.js";
import { Context } from "../context.js";



/**
 * A metric factory function.
 *
 * @param type The type of the metric to create.
 * @param v The value with which to instantiate the metric.
 * @returns A metric instance.
 * @throws
 * - In case type is not listed in the `Context.supportedMetrics`;
 * - In case `v` is not in the correct representation for the wanted metric type.
 */
export function createMetric(type: string, v: unknown): Metric<JSONValue, JSONValue> {
  if (type.startsWith("labeled_")) {
    Context.addSupportedMetric(type, LabeledMetric);
  }

  const ctor = Context.getSupportedMetric(type);
  if (!ctor) {
    throw new Error(`Unable to create metric of unknown type ${type}`);
  }

  return new ctor(v);
}

/**
 * Validates that a given value is in the correct
 * internal representation format for a metric of a given type.
 *
 * @param type The type of the metric to validate
 * @param v The value to verify
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
