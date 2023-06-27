/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSONValue } from "../../utils.js";
import type { Metric } from "../metric.js";
import type { Metrics, MetricType } from "../index.js";
import type { Lifetime } from "../lifetime.js";
import type { OptionalAsync } from "../../types.js";

import { createMetric } from "../utils.js";

export const METRICS_DATABASE_LOG_TAG = "core.Metrics.Database";

/**
 * The metrics database is an abstraction layer on top of the underlying storage.
 *
 * Metric data is saved to the database in the following format:
 *
 * {
 *  "pingName": {
 *    "metricType (i.e. boolean)": {
 *      "metricIdentifier": metricPayload
 *    }
 *  }
 * }
 *
 * We have one store in this format for each lifetime: user, ping and application.
 *
 */
export interface IMetricsDatabase {
  /**
   * Records a given value to a given metric.
   * Will overwrite in case there is already a value in there.
   *
   * @param metric The metric to record to.
   * @param value The value we want to record to the given metric.
   */
  record(metric: MetricType, value: Metric<JSONValue, JSONValue>): OptionalAsync<void>;

  /**
   * Records a given value to a given metric,
   * by applying a transformation function on the value currently persisted.
   *
   * @param metric The metric to record to.
   * @param transformFn The transformation function to apply to the currently persisted value.
   */
  transform(
    metric: MetricType,
    transformFn: (v?: JSONValue) => Metric<JSONValue, JSONValue>
  ): OptionalAsync<void>;

  /**
   * Checks if anything was stored for the provided metric.
   *
   * @param lifetime the metric `Lifetime`.
   * @param ping the ping storage to search in.
   * @param metricType the type of the metric.
   * @param metricIdentifier the metric identifier.
   * @returns `true` if the metric was found (regardless of the validity of the
   *          stored data), `false` otherwise.
   */
  hasMetric(
    lifetime: Lifetime,
    ping: string,
    metricType: string,
    metricIdentifier: string
  ): OptionalAsync<boolean>;

  /**
   * Counts the number of stored metrics with an id starting with a specific identifier.
   *
   * @param lifetime the metric `Lifetime`.
   * @param ping the ping storage to search in.
   * @param metricType the type of the metric.
   * @param metricIdentifier the metric identifier.
   * @returns the number of stored metrics with their id starting with the given identifier.
   */
  countByBaseIdentifier(
    lifetime: Lifetime,
    ping: string,
    metricType: string,
    metricIdentifier: string
  ): OptionalAsync<number>;

  /**
   * Gets  and validates the persisted payload of a given metric in a given ping.
   *
   * If the persisted value is invalid for the metric we are attempting to retrieve,
   * the persisted value is deleted and `undefined is returned.
   *
   * This behaviour is not consistent with what the Glean SDK does, but this is on purpose.
   * On the Glean SDK we panic when we can't serialize the persisted value,
   * that is because this is an extremely unlikely situation for that environment.
   *
   * Since Glean.js will run on the browser, it is easy for a consumers / developers
   * to mess with the storage which makes this sort of errors plausible.
   * That is why we choose to not panic and simply delete the corrupted data here.
   *
   * Note: This is not a strong guard against consumers / developers messing with the storage on their own.
   * Currently Glean.js does not include mechanisms to reliably prevent that.
   *
   * @param ping The ping from which we want to retrieve the given metric.
   * @param metric An object containing the information about the metric to retrieve.
   * @returns The payload persisted for the given metric,
   *          `undefined` in case the metric has not been recorded yet or the found values in invalid.
   */
  getMetric<T extends JSONValue>(ping: string, metric: MetricType): OptionalAsync<T | undefined>;

  /**
   * Gets all of the persisted metrics related to a given ping.
   *
   * @param ping The name of the ping to retrieve.
   * @param clearPingLifetimeData Whether or not to clear the ping lifetime metrics retrieved.
   * @returns An object containing all the metrics recorded to the given ping,
   *          `undefined` in case the ping doesn't contain any recorded metrics.
   */
  getPingMetrics(ping: string, clearPingLifetimeData: boolean): OptionalAsync<Metrics | undefined>;

  /**
   * Clears currently persisted data for a given lifetime.
   *
   * @param lifetime The lifetime to clear.
   * @param ping The ping to clear data from. When omitted, data from all pings will be cleared.
   */
  clear(lifetime: Lifetime, ping?: string): OptionalAsync<void>;

  /**
   * Clears all persisted metrics data.
   */
  clearAll(): OptionalAsync<void>;
}

// Metrics whose names start with this prefix will
// not be added to the ping payload.
//
// glean_parser rejects metrics with `#` in the name,
// so this is guaranteed not to clash with user defined metrics.
const RESERVED_METRIC_NAME_PREFIX = "reserved#";

// The full identifier of internal metrics.
export const RESERVED_METRIC_IDENTIFIER_PREFIX = `glean.${RESERVED_METRIC_NAME_PREFIX}`;

/**
 * Generates a name for a reserved metric.
 *
 * Reserved metrics are not sent in ping payloads.
 *
 * @param name The name of the metric.
 * @returns The name of metrics with proper identification to make it a reserved metric.
 */
export function generateReservedMetricIdentifiers(name: string): {
  category: string;
  name: string;
} {
  return {
    category: "glean",
    name: `${RESERVED_METRIC_NAME_PREFIX}${name}`
  };
}

/**
 * Creates the metrics payload from a metrics object with metrics in their internal representation.
 *
 * @param v The Metrics object to transform.
 * @returns A metrics object with metrics in their payload format.
 */
export function createMetricsPayload(v: Metrics): Metrics {
  const result: Metrics = {};

  for (const metricType in v) {
    const metrics = v[metricType];
    result[metricType] = {};
    for (const metricIdentifier in metrics) {
      const metric = createMetric(metricType, metrics[metricIdentifier]);
      result[metricType][metricIdentifier] = metric.payload();
    }
  }

  return result;
}
