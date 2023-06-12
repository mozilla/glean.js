/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSONObject } from "../../utils.js";
import type { OptionalAsync } from "../../types.js";

import { strToU8 } from "fflate";
import { DELETION_REQUEST_PING_NAME } from "../../constants.js";
import { isJSONValue, isNumber, isObject, isString } from "../../utils.js";

/// CONSTANTS ///
export const PINGS_DATABASE_LOG_TAG = "core.Pings.Database";

/// TYPES ///
export type PingMap = { [ident: string]: PingInternalRepresentation };
export type PingArray = [string, PingInternalRepresentation][];

/// INTERFACES ///

// IMPORTANT: If this object ever changes, the `isValidPingInternalRepresentation`
// function below needs to be updated accordingly.
export interface PingInternalRepresentation extends JSONObject {
  collectionDate: string;
  path: string;
  payload: JSONObject;
  headers?: Record<string, string>;
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
export interface IPingDatabase {
  /**
   * Attach an observer that reacts to the pings storage changes.
   *
   * @param observer The new observer to attach.
   */
  attachObserver(observer: Observer): void;

  /**
   * Records a new ping to the ping database.
   *
   * @param path The path where this ping must be submitted to.
   * @param identifier The identifier under which to store the ping.
   * @param payload The payload of the ping to record.
   * @param headers Optional headers to include on the final ping request.
   */
  recordPing(
    path: string,
    identifier: string,
    payload: JSONObject,
    headers?: Record<string, string>
  ): OptionalAsync<void>;

  /**
   * Deletes a specific ping from the database.
   *
   * @param identifier The identifier of the ping to delete.
   */
  deletePing(identifier: string): OptionalAsync<void>;

  /**
   * Gets all pings from the pings database.
   * Deletes any data in unexpected format that is found.
   *
   * # Note
   *
   * The return value of this function can be turned into an object using Object.fromEntries.
   *
   * @returns List of all currently stored pings in ascending order by date.
   */
  getAllPings(): OptionalAsync<[string, PingInternalRepresentation][]>;

  /**
   * Scans the database for pending pings and enqueues them.
   *
   * # Important
   *
   * This function will also clear off pings in case
   * the database is exceeding the ping or size quota.
   */
  scanPendingPings(): OptionalAsync<void>;

  /**
   * Clears all the pings from the database.
   */
  clearAll(): OptionalAsync<void>;
}

/// HELPERS ///
/**
 * Whether or not a given ping is a deletion-request ping.
 *
 * @param ping The ping to verify.
 * @returns Whether or not the ping is a deletion-request ping.
 */
export function isDeletionRequest(ping: PingInternalRepresentation): boolean {
  return ping.path.split("/")[3] === DELETION_REQUEST_PING_NAME;
}

/**
 * Gets the size of a ping in bytes.
 *
 * @param ping The ping to get the size of.
 * @returns Size of the given ping in bytes.
 */
export function getPingSize(ping: PingInternalRepresentation): number {
  return strToU8(JSON.stringify(ping)).length;
}

/**
 * Checks whether or not `v` is in the correct ping internal representation
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is in the correct ping internal representation.
 */
export function isValidPingInternalRepresentation(v: unknown): v is PingInternalRepresentation {
  if (isObject(v)) {
    const hasValidCollectionDate =
      "collectionDate" in v &&
      isString(v.collectionDate) &&
      isNumber(new Date(v.collectionDate).getTime());
    const hasValidPath = "path" in v && isString(v.path);
    const hasValidPayload = "payload" in v && isJSONValue(v.payload) && isObject(v.payload);
    const hasValidHeaders = !("headers" in v) || (isJSONValue(v.headers) && isObject(v.headers));
    if (!hasValidCollectionDate || !hasValidPath || !hasValidPayload || !hasValidHeaders) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Put pings in ascending order based on their collection time.
 *
 * @param pings Map of pings.
 * @returns Sorted pings.
 */
export function sortPings(pings: PingMap): PingArray {
  return Object.entries(pings).sort(
    ([_idA, { collectionDate: dateA }], [_idB, { collectionDate: dateB }]): number => {
      const timeA = new Date(dateA).getTime();
      const timeB = new Date(dateB).getTime();
      return timeA - timeB;
    }
  );
}
