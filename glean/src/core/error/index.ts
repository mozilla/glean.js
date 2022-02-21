/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { MetricType } from "../metrics/index.js";
import type { ErrorType } from "./error_type.js";
import { InternalCounterMetricType as CounterMetricType} from "../metrics/types/counter.js";
import { combineIdentifierAndLabel, stripLabel } from "../metrics/types/labeled.js";
import log from "../log.js";

/**
 * Create a log tag for a specific metric type.
 *
 * @param metric The metric type to create a tag for.
 * @returns The tag.
 */
function createLogTag(metric: MetricType): string {
  const capitalizedType = metric.type.charAt(0).toUpperCase() + metric.type.slice(1);
  return `core.Metrics.${capitalizedType}`;
}

/**
 * For a given metric, get the metric in which to record errors.
 *
 * # Important
 *
 * Errors do not adhere to the usual "maximum label" restriction.
 *
 * @param metric The metric to record an error for.
 * @param error The error type to record.
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

export default class ErrorManager {
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
  async record(
    metric: MetricType,
    error: ErrorType,
    message: unknown,
    numErrors = 1
  ): Promise<void> {
    const errorMetric = getErrorMetricForMetric(metric, error);
    log(createLogTag(metric), [`${metric.baseIdentifier()}:`, message]);
    if (numErrors > 0) {
      await errorMetric.addUndispatched(numErrors);
    }
  }

  /**
   * Gets the number of recorded errors for the given metric and error type.
   *
   * @param metric The metric to get the number of errors for.
   * @param error The error type to get count of.
   * @param ping The ping from which we want to retrieve the number of recorded errors.
   *        Defaults to the first value in `sendInPings`.
   * @returns The number of errors reported.
   */
  async testGetNumRecordedErrors(
    metric: MetricType,
    error: ErrorType,
    ping?: string
  ): Promise<number> {
    const errorMetric = getErrorMetricForMetric(metric, error);
    const numErrors = await errorMetric.testGetValue(ping);
    return numErrors || 0;
  }
}

