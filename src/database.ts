// /* This Source Code Form is subject to the terms of the Mozilla Public
//  * License, v. 2.0. If a copy of the MPL was not distributed with this
//  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { StorageValue, Store } from "storage";
import PersistentStore from "storage/persistent";
import Metric, { Lifetime } from "metrics";
import { MetricPayload, isMetricPayload } from "metrics/payload";
import { isObject, isUndefined } from "utils";

export interface PingPayload {
  [aMetricType: string]: {
    [aMetricIdentifier: string]: MetricPayload
  }
}

/**
 * Verifies if a given value is a valid PingPayload.
 *
 * @param v The value to verify
 *
 * @returns Whether or not `v` is a valid PingPayload.
 */
export function isValidPingPayload(v: unknown): v is PingPayload {
  if (isObject(v)) {
    // The root keys should all be metric types.
    for (const metricType in v) {
      const metrics = v[metricType];
      if (isObject(metrics)) {
        for (const metricIdentifier in metrics) {
          if (!isMetricPayload(metricType, metrics[metricIdentifier])) {
            return false;
          }
        }
      } else {
        return false;
      }
    }
    return true;
  } else {
    return false;
  }

}

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
class Database {
  private userStore: Store;
  private pingStore: Store;
  private appStore: Store;

  constructor() {
    this.userStore = new PersistentStore("userLifetimeMetrics");
    this.pingStore = new PersistentStore("pingLifetimeMetrics");
    this.appStore = new PersistentStore("appLifetimeMetrics");
  }

  /**
   * Returns the store instance for a given lifetime.
   *
   * @param lifetime The lifetime related to the store we want to retrieve.
   *
   * @returns The store related to the given lifetime.
   *
   * @throws If the provided lifetime does not have a related store.
   */
  private _chooseStore(lifetime: Lifetime): Store {
    switch (lifetime) {
    case Lifetime.User:
      return this.userStore;
    case Lifetime.Ping:
      return this.pingStore;
    case Lifetime.Application:
      return this.appStore;
    default:
      throw Error(`Attempted to retrive a store for an unknown lifetime: ${lifetime}`);
    }
  }

  /**
   * Records a given value to a given metric.
   * Will overwrite in case there is already a value in there.
   *
   * @param metric The metric to record to.
   * @param value The value we want to record to the given metric.
   */
  async record(metric: Metric, value: MetricPayload): Promise<void> {
    this.transform(metric, () => value);
  }

  /**
   * Records a given value to a given metric,
   * by applying a transformation function on the value currently persisted.
   *
   * @param metric The metric to record to.
   * @param transformFn The transformation function to apply to the currently persisted value.
   */
  async transform(metric: Metric, transformFn: (v?: MetricPayload) => MetricPayload): Promise<void> {
    if (metric.disabled) {
      return;
    }

    const store = this._chooseStore(metric.lifetime);
    const storageKey = metric.identifier;
    for (const ping of metric.sendInPings) {
      const finalTransformFn = (v: StorageValue): Exclude<StorageValue, undefined> => {
        if (!isUndefined(v) && !isMetricPayload(metric.type, v)) {
          throw new Error(`Unexpected value found for metric ${metric}: ${JSON.stringify(v)}.`);
        }
        return transformFn(v);
      };
      await store.update([ping, metric.type, storageKey], finalTransformFn);
    }
  }

  /**
   * Gets the persisted payload of a given metric in a given ping.
   *
   * @param ping The ping from which we want to retrieve the given metric.
   * @param validateFn A validation function to verify if persisted payload is of the correct type.
   * @param metric An object containing the information about the metric to retrieve.
   *
   * @returns The payload persisted for the given metric,
   *          `undefined` in case the metric has not been recorded yet.
   */
  async getMetric<T>(
    ping: string,
    validateFn: (v: unknown) => v is T,
    metric: Metric
  ): Promise<T | undefined> {
    const store = this._chooseStore(metric.lifetime);
    const storageKey = metric.identifier;
    const value = await store.get([ping, metric.type, storageKey]);
    if (!isUndefined(value) && !validateFn(value)) {
      // The following behaviour is not consistent with what the Glean SDK does, but this is on purpose.
      // On the Glean SDK we panic when we can't serialize the given,
      // that is because this is a extremely unlikely situation for that environment.
      //
      // Since Glean.js will run on the browser, it is easy for a user to mess with the persisted data
      // which makes this sort of errors plausible. That is why we choose to not panic and
      // simply delete the corrupted data here.
      console.error(`Unexpected value found for metric ${metric.identifier}: ${JSON.stringify(value)}. Clearing.`);
      await store.delete([ping, metric.type, storageKey]);
      return;
    } else {
      return value;
    }
  }

  /**
   * Helper function to validate and get a specific lifetime data
   * related to a ping from the underlying storage.
   *
   * # Note
   *
   * If the value in storage for any of the metrics in the ping is of an unexpected type,
   * the whole ping payload for that lifetime will be thrown away.
   *
   * @param ping The ping we want to get the data from
   * @param lifetime The lifetime of the data we want to retrieve
   *
   * @returns The ping payload found for the given parameters or an empty object
   *          in case no data was found or the data that was found, was invalid.
   */
  private async getAndValidatePingData(ping: string, lifetime: Lifetime): Promise<PingPayload> {
    const store = this._chooseStore(lifetime);
    const data = await store.get([ping]);
    if (isUndefined(data)) {
      return {};
    }

    if (!isValidPingPayload(data)) {
      console.error(`Unexpected value found for ping ${ping} in ${lifetime} store: ${JSON.stringify(data)}. Clearing.`);
      await store.delete([ping]);
      return {};
    }

    return data;
  }

  /**
   * Gets all of the persisted metrics related to a given ping.
   *
   * @param ping The name of the ping to retrieve.
   * @param clearPingLifetimeData Whether or not to clear the ping lifetime metrics retrieved.
   *
   * @returns An object containing all the metrics recorded to the given ping,
   *          `undefined` in case the ping doesn't contain any recorded metrics.
   */
  async getPing(ping: string, clearPingLifetimeData: boolean): Promise<PingPayload | undefined> {
    const userData = await this.getAndValidatePingData(ping, Lifetime.User);
    const pingData = await this.getAndValidatePingData(ping, Lifetime.Ping);
    const appData = await this.getAndValidatePingData(ping, Lifetime.Application);

    if (clearPingLifetimeData) {
      await this.clear(Lifetime.Ping);
    }

    const response: PingPayload = { ...pingData };
    for (const data of [userData, appData]) {
      for (const metricType in data) {
        response[metricType] = {
          ...response[metricType],
          ...data[metricType]
        };
      }
    }

    if (Object.keys(response).length === 0) {
      return;
    } else {
      return response;
    }
  }

  /**
   * Clears currently persisted data for a given lifetime.
   *
   * @param lifetime The lifetime to clear.
   */
  async clear(lifetime: Lifetime): Promise<void> {
    const store = this._chooseStore(lifetime);
    await store.delete([]);
  }

  /**
   * Clears all persisted metrics data.
   */
  async clearAll(): Promise<void> {
    await this.userStore.delete([]);
    await this.pingStore.delete([]);
    await this.appStore.delete([]);
  }
}

export default Database;
