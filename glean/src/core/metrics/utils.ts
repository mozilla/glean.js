/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


import type { Metric, MetricValidationResult } from "./metric.js";
import { MetricValidation } from "./metric.js";
import type { JSONValue } from "../utils.js";
import { isInteger, isString } from "../utils.js";

import { LabeledMetric } from "./types/labeled.js";
import { Context } from "../context.js";
import { ErrorType } from "@mozilla/glean/error";

import log, { LoggingLevel } from "../log.js";

const LOG_TAG = "Glean.core.Metrics.utils";

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
    throw new Error(`Unable to create metric of unknown type "${type}".`);
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
  } catch(e) {
    log(LOG_TAG, (e as Error).message, LoggingLevel.Error);
    return false;
  }
}

/**
 * Validates that a given value is a positive integer.
 *
 * @param v The value to validate
 * @param zeroIsValid Whether or not to consider 0 a valid value, defaults to `true`
 * @returns A validation result
 */
export function validatePositiveInteger(v: unknown, zeroIsValid = true): MetricValidationResult {
  if (!isInteger(v)) {
    return {
      type: MetricValidation.Error,
      errorMessage: `Expected integer value, got ${JSON.stringify(v)}`
    };
  }

  const validation = zeroIsValid ? v < 0 : v <= 0;
  if (validation) {
    return {
      type: MetricValidation.Error,
      errorMessage: `Expected positive value, got ${JSON.stringify(v)}`,
      errorType: ErrorType.InvalidValue
    };
  }

  return { type: MetricValidation.Success };
}

/**
 * Validates that a given value is a string.
 *
 * @param v The value to validate
 * @returns A validation result
 */
export function validateString(v: unknown): MetricValidationResult {
  if (!isString(v)) {
    return {
      type: MetricValidation.Error,
      errorMessage: `Expected string value, got ${JSON.stringify(v)}`
    };
  }

  return { type: MetricValidation.Success };
}
