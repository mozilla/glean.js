/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { MetricType } from "../metrics";
import type { ErrorType } from "./error_type.js";
import CounterMetricType from "../metrics/types/counter";
import { combineIdentifierAndLabel, stripLabel } from "../metrics/types/labeled";

/**
 * For a given metric, get the metric in which to record errors.
 *
 * # Important
 *
 * Errors do not adhere to the usual "maximum label" restriction.
 *
 * @param metric The metric to record an error for.
 * @param error The error type to record.
 *
 * @returns The metric to record to.
 */
function getErrorMetricForMetric(metric: MetricType, error: ErrorType): CounterMetricType {
  const identifier = metric.baseIdentifier();
  const name = stripLabel(identifier);

  // We don't use the labeled metric type here,
  // because we want to bypass the max number of allowed labels.
  return new CounterMetricType({
    name: combineIdentifierAndLabel(error, name),
    category: "glean.error",
    lifetime: "ping",
    // TODO: Also add the metric ping to the list. Depends on Bug 1710838.
    sendInPings: metric.sendInPings,
    disabled: false,
  });
}

export default {
  /**
   * Records an error into Glean.
   *
   * Errors are recorded as labeled counters in the `glean.error` category.
   *
   * @param metric The metric to record an error for.
   * @param error The error type to record.
   * @param message The message to log. This message is not sent with the ping.
   *        It does not need to include the metric id, as that is automatically
   *        prepended to the message.
   * @param numErrors The number of errors of the same type to report.
   */
  record: async (
    metric: MetricType,
    error: ErrorType,
    message: string,
    numErrors = 1
  ): Promise<void> => {
    const errorMetric = getErrorMetricForMetric(metric, error);
    console.warn(`${metric.baseIdentifier()}: ${message}`);
    if (numErrors > 0) {
      await CounterMetricType._private_addUndispatched(errorMetric, numErrors);
    } else {
      // TODO: Throw error only when in test mode. Depends on Bug 1682771.
    }
  },

  /**
   * Gets the number of recorded errors for the given metric and error type.
   *
   * @param metric The metric to get the number of errors for.
   * @param error The error type to get count of.
   * @param ping The ping from which we want to retrieve the number of recorded errors.
   *        Defaults to the first value in `sendInPings`.
   *
   * @returns The number of errors reported.
   */
  testGetNumRecordedErrors: async (
    metric: MetricType,
    error: ErrorType,
    ping?: string
  ): Promise<number> => {
    const errorMetric = getErrorMetricForMetric(metric, error);
    const numErrors = await errorMetric.testGetValue(ping);
    return numErrors || 0;
  }
};

