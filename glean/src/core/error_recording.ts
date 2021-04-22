/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { MetricType } from "./metrics";
import { Lifetime } from "./metrics/lifetime";
import CounterMetricType from "./metrics/types/counter";
import { combineIdentifierAndLabel } from "./metrics/types/labeled_utils";

/**
 * The possible error types for metric recording.
 */
enum ErrorType {
  /// For when the value to be recorded does not match the metric-specific restrictions
  InvalidValue = "invalid_value",
  /// For when the label of a labeled metric does not match the restrictions
  InvalidLabel = "invalid_label",
  /// For when the metric caught an invalid state while recording
  InvalidState = "invalid_state",
  /// For when the value to be recorded overflows the metric-specific upper range
  InvalidOverflow = "invalid_overflow",
}

/**
 * For a given metric, get the metric in which to record errors.
 *
 * @param metric The metric to record an error to.
 * @param error The type of error to record.
 *
 * @returns The metric in which to record errors.
 */
function getErrorMetricForMetric(metric: MetricType, error: ErrorType): CounterMetricType {
  // TODO: Record errors in the pings the metric is in, as well as the metrics ping.
  return new CounterMetricType({
    ...metric,
    name: combineIdentifierAndLabel(error, metric.baseIdentifier()),
    category: "glean.error",
    lifetime: Lifetime.Ping
  });
}
