/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type SynchronousStore from "../../storage/sync.js";
import type { MetricType, Metrics } from "../index.js";
import type { Metric } from "../metric.js";

import type { JSONObject, JSONValue } from "../../utils.js";
import { validateMetricInternalRepresentation } from "../utils.js";
import { isObject, isUndefined } from "../../utils.js";
import { Lifetime } from "../lifetime.js";
import log, { LoggingLevel } from "../../log.js";
import { Context } from "../../context.js";
import {
  createMetricsPayload,
  METRICS_DATABASE_LOG_TAG,
  RESERVED_METRIC_IDENTIFIER_PREFIX
} from "./shared.js";

// See `IMetricsDatabase` for method documentation.
class MetricsDatabaseSync {
  private userStore: SynchronousStore;
  private pingStore: SynchronousStore;
  private appStore: SynchronousStore;

  constructor() {
    this.userStore = new Context.platform.Storage("userLifetimeMetrics") as SynchronousStore;
    this.pingStore = new Context.platform.Storage("pingLifetimeMetrics") as SynchronousStore;
    this.appStore = new Context.platform.Storage("appLifetimeMetrics") as SynchronousStore;
  }

  /// PUBLIC ///
  record(metric: MetricType, value: Metric<JSONValue, JSONValue>): void {
    this.transform(metric, () => value);
  }

  transform(
    metric: MetricType,
    transformFn: (v?: JSONValue) => Metric<JSONValue, JSONValue>
  ): void {
    if (metric.disabled) {
      return;
    }

    const store = this._chooseStore(metric.lifetime);

    const storageKey = metric.identifierSync();

    for (const ping of metric.sendInPings) {
      const finalTransformFn = (v?: JSONValue): JSONValue => transformFn(v).get();
      store.update([ping, metric.type, storageKey], finalTransformFn);
    }
  }

  hasMetric(
    lifetime: Lifetime,
    ping: string,
    metricType: string,
    metricIdentifier: string
  ): boolean {
    const store = this._chooseStore(lifetime);
    const value = store.get([ping, metricType, metricIdentifier]);
    return !isUndefined(value);
  }

  countByBaseIdentifier(
    lifetime: Lifetime,
    ping: string,
    metricType: string,
    metricIdentifier: string
  ): number {
    const store = this._chooseStore(lifetime);
    const pingStorage = store.get([ping, metricType]);
    if (isUndefined(pingStorage)) {
      return 0;
    }

    return Object.keys(pingStorage).filter((n) => n.startsWith(metricIdentifier)).length;
  }

  getMetric<T extends JSONValue>(ping: string, metric: MetricType): T | undefined {
    const store = this._chooseStore(metric.lifetime);
    const storageKey = metric.identifierSync();
    const value = store.get([ping, metric.type, storageKey]);
    if (!isUndefined(value) && !validateMetricInternalRepresentation<T>(metric.type, value)) {
      log(
        METRICS_DATABASE_LOG_TAG,
        `Unexpected value found for metric ${storageKey}: ${JSON.stringify(value)}. Clearing.`,
        LoggingLevel.Error
      );
      store.delete([ping, metric.type, storageKey]);
      return;
    } else {
      return value;
    }
  }

  getPingMetrics(ping: string, clearPingLifetimeData: boolean): Metrics | undefined {
    const userData = this.getCorrectedPingData(ping, Lifetime.User);
    const pingData = this.getCorrectedPingData(ping, Lifetime.Ping);
    const appData = this.getCorrectedPingData(ping, Lifetime.Application);

    if (clearPingLifetimeData && Object.keys(pingData).length > 0) {
      this.clear(Lifetime.Ping, ping);
    }

    const response: Metrics = {};
    for (const data of [userData, pingData, appData]) {
      for (const metricType in data) {
        for (const metricId in data[metricType]) {
          if (!metricId.startsWith(RESERVED_METRIC_IDENTIFIER_PREFIX)) {
            if (metricId.includes("/")) {
              // While labeled data is stored within the subtype storage (e.g. counter storage), it
              // needs to live in a different section of the ping payload (e.g. `labeled_counter`).
              this.processLabeledMetric(response, metricType, metricId, data[metricType][metricId]);
            } else {
              response[metricType] = {
                ...response[metricType],
                [metricId]: data[metricType][metricId]
              };
            }
          }
        }
      }
    }

    if (Object.keys(response).length === 0) {
      return;
    } else {
      return createMetricsPayload(response);
    }
  }

  clear(lifetime: Lifetime, ping?: string): void {
    const store = this._chooseStore(lifetime);
    const storageIndex = ping ? [ping] : [];
    store.delete(storageIndex);
  }

  clearAll(): void {
    this.userStore.delete([]);
    this.pingStore.delete([]);
    this.appStore.delete([]);
  }

  /// PRIVATE ///
  /**
   * Returns the store instance for a given lifetime.
   *
   * @param lifetime The lifetime related to the store we want to retrieve.
   * @returns The store related to the given lifetime.
   * @throws If the provided lifetime does not have a related store.
   */
  private _chooseStore(lifetime: Lifetime): SynchronousStore {
    switch (lifetime) {
    case Lifetime.User:
      return this.userStore;
    case Lifetime.Ping:
      return this.pingStore;
    case Lifetime.Application:
      return this.appStore;
    }
  }

  /**
   * Helper function to validate and get a specific lifetime data
   * related to a ping from the underlying storage.
   *
   * # Note
   *
   * If invalid data is encountered it will be deleted and won't be part of the final ping payload.
   *
   * @param ping The ping we want to get the data from
   * @param lifetime The lifetime of the data we want to retrieve
   * @returns The ping payload found for the given parameters or an empty object
   *          in case no data was found or the data that was found, was invalid.
   */
  private getCorrectedPingData(ping: string, lifetime: Lifetime): Metrics {
    const store = this._chooseStore(lifetime);
    const data = store.get([ping]);
    if (isUndefined(data)) {
      return {};
    }

    if (!isObject(data)) {
      log(
        METRICS_DATABASE_LOG_TAG,
        `Invalid value found in storage for ping "${ping}". Deleting.`,
        LoggingLevel.Debug
      );
      store.delete([ping]);
      return {};
    }

    const correctedData: Metrics = {};
    // All top keys should be metric types.
    for (const metricType in data) {
      const metrics = data[metricType];
      if (!isObject(metrics)) {
        log(
          METRICS_DATABASE_LOG_TAG,
          `Unexpected data found in storage for metrics of type "${metricType}" in ping "${ping}". Deleting.`,
          LoggingLevel.Debug
        );
        store.delete([ping, metricType]);
        continue;
      }

      for (const metricIdentifier in metrics) {
        if (!validateMetricInternalRepresentation(metricType, metrics[metricIdentifier])) {
          log(
            METRICS_DATABASE_LOG_TAG,
            `Invalid value "${JSON.stringify(
              metrics[metricIdentifier]
            )}" found in storage for metric "${metricIdentifier}". Deleting.`,
            LoggingLevel.Debug
          );

          store.delete([ping, metricType, metricIdentifier]);
          continue;
        }

        if (!correctedData[metricType]) {
          correctedData[metricType] = {};
        }

        // Coercion is fine here, `validateMetricInternalRepresentation`
        // validated that this is of the correct type.
        correctedData[metricType][metricIdentifier] = metrics[metricIdentifier] as JSONValue;
      }
    }

    return correctedData;
  }

  private processLabeledMetric(
    snapshot: Metrics,
    metricType: string,
    metricId: string,
    metricData: JSONValue
  ) {
    const newType = `labeled_${metricType}`;
    const idLabelSplit = metricId.split("/", 2);
    const newId = idLabelSplit[0];
    const label = idLabelSplit[1];

    if (newType in snapshot && newId in snapshot[newType]) {
      // Other labels were found for this metric. Do not throw them away.
      const existingData = snapshot[newType][newId];
      snapshot[newType][newId] = {
        ...(existingData as JSONObject),
        [label]: metricData
      };
    } else {
      // This is the first label for this metric.
      snapshot[newType] = {
        ...snapshot[newType],
        [newId]: {
          [label]: metricData
        }
      };
    }
  }
}

export default MetricsDatabaseSync;
