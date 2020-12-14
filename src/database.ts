// /* This Source Code Form is subject to the terms of the Mozilla Public
//  * License, v. 2.0. If a copy of the MPL was not distributed with this
//  * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { StorageValue, Store } from "storage";
import PersistentStore from "storage/persistent";
import Metric, { Lifetime } from "metrics";
import { isObject, isString, isUndefined } from "utils";

export interface PingPayload {
  [aMetricType: string]: {
    [aMetricIdentifier: string]: string
  }
}

/**
 * Verifies if a given value is a valid PingPayload.
 *
 * @param v The value to verify
 */
export function isValidPingPayload(v: StorageValue): v is PingPayload {
  if (isObject(v)) {
    // The root keys should all be metric types.
    for (const metricType in v) {
      const metrics = v[metricType];
      if (isObject(metrics)) {
        for (const metricIdentifier in metrics) {
          if (!isString(metrics[metricIdentifier])) {
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
 *      "metricCategory?.metricName": metricPayload
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
    this.userStore = new PersistentStore("user");
    this.pingStore = new PersistentStore("ping");
    this.appStore = new PersistentStore("app");
  }

  /**
   * The key under which to save a metrics value.
   *
   * @param metric The metric for which to build the storage key
   */
  private _buildStorageKey(metric: Metric): string {
    if (metric.category) {
      return `${metric.category}.${metric.name}`;
    } else {
      return metric.name;
    }
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
  async record(metric: Metric, value: string): Promise<void> {
    if (!metric.disabled) {
      const store = this._chooseStore(metric.lifetime);
      const storageKey = this._buildStorageKey(metric);
      for (const ping of metric.sendInPings) {
        await store.update([ping, metric.type, storageKey], () => value);
      }
    }
  }

  /**
   * Records a given value to a given metric,
   * by applying a transformation function on the value currently persisted.
   *
   * @param metric The metric to record to.
   * @param transformFn The transformation function to apply to the currently persisted value.
   */
  async transform(metric: Metric, transformFn: (v?: string) => string): Promise<void> {
    if (!metric.disabled) {
      const store = this._chooseStore(metric.lifetime);
      const storageKey = this._buildStorageKey(metric);
      for (const ping of metric.sendInPings) {
        const finalTransformFn = (v: StorageValue): string => {
          if (isObject(v)) {
            throw new Error(`Unexpected value found for metric ${metric}: ${JSON.stringify(v)}.`);
          }
          return transformFn(v);
        };
        await store.update([ping, metric.type, storageKey], finalTransformFn);
      }
    }
  }

  /**
   * Gets the persisted payload of a given metric in a given ping.
   *
   * @param ping The ping from which we want to retrieve the given metric.
   * @param metric An object containing the information about the metric to retrieve.
   *
   * @returns The string encoded payload persisted for the given metric,
   *          `undefined` in case the metric has not been recorded yet.
   */
  async getMetric(ping: string, metric: Metric): Promise<string | undefined> {
    const store = this._chooseStore(metric.lifetime);
    const storageKey = this._buildStorageKey(metric);
    const value = await store.get([ping, metric.type, storageKey]);
    if (isObject(value)) {
      console.error(`Unexpected value found for metric ${metric}: ${JSON.stringify(value)}. Clearing.`);
      await store.delete([ping, metric.type, storageKey]);
      return;
    } else {
      return value;
    }
  }

  /**
   * Gets all of the persisted metrics related to a given ping.
   *
   * # Note
   *
   * If the value in storage for any of the metrics in a ping is of an unexpected type,
   * the whole ping payload for that lifetime will be thrown away.
   *
   * @param ping The name of the ping to retrieve.
   * @param clearPingLifetimeData Whether or not to clear the ping lifetime metrics retrieved.
   *
   * @returns An object containing all the metrics recorded to the given ping,
   *          `undefined` in case the ping doesn't contain any recorded metrics.
   */
  async getPing(ping: string, clearPingLifetimeData: boolean): Promise<PingPayload | undefined> {
    const getAndValidatePingData = async (storeName: string, store: Store): Promise<PingPayload> => {
      const data = await store.get([ping]);
      if (isUndefined(data)) {
        return {};
      }

      if (!isValidPingPayload(data)) {
        console.error(`Unexpected value found for ping ${ping} in ${storeName} store: ${JSON.stringify(data)}. Clearing.`);
        await store.delete([ping]);
        return {};
      }

      return data;
    };

    const userData = await getAndValidatePingData("user", this.userStore);
    const pingData = await getAndValidatePingData("ping", this.pingStore);
    const appData = await getAndValidatePingData("app", this.appStore);

    if (clearPingLifetimeData) {
      await this.clear(Lifetime.Ping);
    }

    // Start out with the ping lifetime data,
    // because it is the one that will probably have more data since it is the default.
    const response: PingPayload = { ...pingData };
    // Merge the other two lifetimes data with it.
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
   *        If not provided, data for all lifetimes will be cleared.
   */
  async clear(lifetime?: Lifetime): Promise<void> {
    if (lifetime) {
      const store = this._chooseStore(lifetime);
      await store.delete([]);
    } else {
      await this.userStore.delete([]);
      await this.pingStore.delete([]);
      await this.appStore.delete([]);
    }
  }
}

export default Database;
