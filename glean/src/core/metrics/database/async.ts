// /* This Source Code Form is subject to the terms of the Mozilla Public
//  * License, v. 2.0. If a copy of the MPL was not distributed with this
//  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Store from "../../storage/async.js";
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
class MetricsDatabase {
  private userStore: Store;
  private pingStore: Store;
  private appStore: Store;

  constructor() {
    this.userStore = new Context.platform.Storage("userLifetimeMetrics") as Store;
    this.pingStore = new Context.platform.Storage("pingLifetimeMetrics") as Store;
    this.appStore = new Context.platform.Storage("appLifetimeMetrics") as Store;
  }

  async record(metric: MetricType, value: Metric<JSONValue, JSONValue>): Promise<void> {
    await this.transform(metric, () => value);
  }

  async transform(
    metric: MetricType,
    transformFn: (v?: JSONValue) => Metric<JSONValue, JSONValue>
  ): Promise<void> {
    if (metric.disabled) {
      return;
    }

    const store = this.chooseStore(metric.lifetime);
    const storageKey = await metric.identifier();
    for (const ping of metric.sendInPings) {
      const finalTransformFn = (v?: JSONValue): JSONValue => transformFn(v).get();
      await store.update([ping, metric.type, storageKey], finalTransformFn);
    }
  }

  async hasMetric(
    lifetime: Lifetime,
    ping: string,
    metricType: string,
    metricIdentifier: string
  ): Promise<boolean> {
    const store = this.chooseStore(lifetime);
    const value = await store.get([ping, metricType, metricIdentifier]);
    return !isUndefined(value);
  }

  async countByBaseIdentifier(
    lifetime: Lifetime,
    ping: string,
    metricType: string,
    metricIdentifier: string
  ): Promise<number> {
    const store = this.chooseStore(lifetime);
    const pingStorage = await store.get([ping, metricType]);
    if (isUndefined(pingStorage)) {
      return 0;
    }

    return Object.keys(pingStorage).filter((n) => n.startsWith(metricIdentifier)).length;
  }

  async getMetric<T extends JSONValue>(ping: string, metric: MetricType): Promise<T | undefined> {
    const store = this.chooseStore(metric.lifetime);
    const storageKey = await metric.identifier();
    const value = await store.get([ping, metric.type, storageKey]);
    if (!isUndefined(value) && !validateMetricInternalRepresentation<T>(metric.type, value)) {
      log(
        METRICS_DATABASE_LOG_TAG,
        `Unexpected value found for metric ${storageKey}: ${JSON.stringify(value)}. Clearing.`,
        LoggingLevel.Error
      );
      await store.delete([ping, metric.type, storageKey]);
      return;
    } else {
      return value;
    }
  }

  async getPingMetrics(ping: string, clearPingLifetimeData: boolean): Promise<Metrics | undefined> {
    const userData = await this.getCorrectedPingData(ping, Lifetime.User);
    const pingData = await this.getCorrectedPingData(ping, Lifetime.Ping);
    const appData = await this.getCorrectedPingData(ping, Lifetime.Application);

    if (clearPingLifetimeData && Object.keys(pingData).length > 0) {
      await this.clear(Lifetime.Ping, ping);
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

  async clear(lifetime: Lifetime, ping?: string): Promise<void> {
    const store = this.chooseStore(lifetime);
    const storageIndex = ping ? [ping] : [];
    await store.delete(storageIndex);
  }

  async clearAll(): Promise<void> {
    await this.userStore.delete([]);
    await this.pingStore.delete([]);
    await this.appStore.delete([]);
  }

  /// PRIVATE ///
  /**
   * Returns the store instance for a given lifetime.
   *
   * @param lifetime The lifetime related to the store we want to retrieve.
   * @returns The store related to the given lifetime.
   * @throws If the provided lifetime does not have a related store.
   */
  private chooseStore(lifetime: Lifetime): Store {
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
  private async getCorrectedPingData(ping: string, lifetime: Lifetime): Promise<Metrics> {
    const store = this.chooseStore(lifetime);
    const data = await store.get([ping]);
    if (isUndefined(data)) {
      return {};
    }

    if (!isObject(data)) {
      log(
        METRICS_DATABASE_LOG_TAG,
        `Invalid value found in storage for ping "${ping}". Deleting.`,
        LoggingLevel.Debug
      );
      await store.delete([ping]);
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
        await store.delete([ping, metricType]);
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

          await store.delete([ping, metricType, metricIdentifier]);
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

export default MetricsDatabase;
