/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Store from "../storage/index.js";
import { isObject, isJSONValue, JSONObject, isString } from "../utils.js";
import { StorageBuilder } from "../../platform/index.js";

export interface PingInternalRepresentation extends JSONObject {
  path: string,
  payload: JSONObject,
  headers?: Record<string, string>
}

/**
 * Checks whether or not `v` is in the correct ping internal representation
 *
 * @param v The value to verify.
 *
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is in the correct ping internal representation.
 */
export function isValidPingInternalRepresentation(v: unknown): v is PingInternalRepresentation {
  if (isObject(v) && (Object.keys(v).length === 2 || Object.keys(v).length === 3)) {
    const hasValidPath = "path" in v && isString(v.path);
    const hasValidPayload = "payload" in v && isJSONValue(v.payload) && isObject(v.payload);
    const hasValidHeaders = (!("headers" in v)) || (isJSONValue(v.headers) && isObject(v.headers));
    if (!hasValidPath || !hasValidPayload || !hasValidHeaders) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * An interface to be implemented by classes that wish to observe the pings database.
 */
export interface Observer {
  /**
   * Updates an observer about a new ping of a given id
   * that has just been recorded to the pings database.
   *
   * @param identifier The id of the ping that was just recorded.
   * @param ping An object containing the newly recorded ping path, payload and optionally headers.
   */
  update(identifier: string, ping: PingInternalRepresentation): void;
}

/**
 * The pings database is an abstraction layer on top of the underlying storage.
 *
 * Ping data is saved to the database in the following format:
 *
 * {
 *  "<identifier>": {
 *    "path": string,
 *    "payload": PingPayload,
 *    "headers": PingHeaders,
 *  }
 * }
 */
class PingsDatabase {
  private store: Store;
  private observer?: Observer;

  constructor(store: StorageBuilder) {
    this.store = new store("pings");
  }
  
  /**
   * Attach an observer that reacts to the pings storage changes.
   *
   * @param observer The new observer to attach. 
   */
  attachObserver(observer: Observer): void {
    this.observer = observer;
  }

  /**
   * Records a new ping to the ping database.
   *
   * @param path The path where this ping must be submitted to.
   * @param identifier The identifier under which to store the ping.
   * @param payload The payload of the ping to record.
   * @param headers Optional headers to include on the final ping request.
   */
  async recordPing(
    path: string,
    identifier: string,
    payload: JSONObject,
    headers?: Record<string, string>
  ): Promise<void> {
    const ping: PingInternalRepresentation = {
      path,
      payload
    };

    if (headers) {
      ping.headers = headers;
    }

    await this.store.update([identifier], () => ping);

    // Notify the observer that a new ping has been added to the pings database.
    this.observer && this.observer.update(identifier, ping);
  }

  /**
   * Deletes a specific ping from the database.
   *
   * @param identifier The identififer of the ping to delete.
   */
  async deletePing(identifier: string): Promise<void> {
    await this.store.delete([identifier]);
  }

  /**
   * Gets all pings from the pings database. Deletes any data in unexpected format that is found.
   *
   * @returns List of all currently stored pings.
   */
  async getAllPings(): Promise<{ [id: string]: PingInternalRepresentation }> {
    const allStoredPings = await this.store._getWholeStore();
    const finalPings: { [ident: string]: PingInternalRepresentation } = {};
    for (const identifier in allStoredPings) {
      const ping = allStoredPings[identifier];
      if (isValidPingInternalRepresentation(ping)) {
        finalPings[identifier] = ping;
      } else {
        console.warn("Unexpected data found in pings database. Deleting.");
        await this.store.delete([identifier]);
      }
    }

    return finalPings;
  }

  /**
   * Scans the database for pending pings and enqueues them.
   */
  async scanPendingPings(): Promise<void> {
    // If there's no observer, then there's no point in iterating.
    if (!this.observer) {
      return;
    }

    const pings = await this.getAllPings();
    for (const identifier in pings) {
      // Notify the observer that a new ping has been added to the pings database.
      this.observer.update(identifier, pings[identifier]);
    }
  }

  /**
   * Clears all the pings from the database.
   */
  async clearAll(): Promise<void> {
    await this.store.delete([]);
  }
}

export default PingsDatabase;
