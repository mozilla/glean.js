/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Store from "../storage/index.js";
import type { JSONObject} from "../utils.js";
import { isNumber, isObject, isJSONValue, isString } from "../utils.js";
import log, { LoggingLevel } from "../log.js";
import { DELETION_REQUEST_PING_NAME } from "../constants.js";
import { strToU8 } from "fflate";
import { Context } from "../context.js";

const LOG_TAG = "core.Pings.Database";

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
function getPingSize(ping: PingInternalRepresentation): number {
  return strToU8(JSON.stringify(ping)).length;
}

// IMPORTANT: If this object ever changes, the `isValidPingInternalRepresentation`
// function below needs to be updated accordingly.
export interface PingInternalRepresentation extends JSONObject {
  collectionDate: string,
  path: string,
  payload: JSONObject,
  headers?: Record<string, string>
}

/**
 * Checks whether or not `v` is in the correct ping internal representation
 *
 * @param v The value to verify.
 * @returns A special Typescript value (which compiles down to a boolean)
 *          stating whether `v` is in the correct ping internal representation.
 */
export function isValidPingInternalRepresentation(v: unknown): v is PingInternalRepresentation {
  if (isObject(v) && [3, 4].includes(Object.keys(v).length)) {
    const hasValidCollectionDate = "collectionDate" in v && isString(v.collectionDate) && isNumber(new Date(v.collectionDate).getTime());
    const hasValidPath = "path" in v && isString(v.path);
    const hasValidPayload = "payload" in v && isJSONValue(v.payload) && isObject(v.payload);
    const hasValidHeaders = (!("headers" in v)) || (isJSONValue(v.headers) && isObject(v.headers));
    if (!hasValidCollectionDate || !hasValidPath || !hasValidPayload || !hasValidHeaders) {
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

  constructor() {
    this.store = new Context.platform.Storage("pings");
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
      collectionDate: (new Date()).toISOString(),
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
   * Gets all pings from the pings database.
   * Deletes any data in unexpected format that is found.
   *
   * # Note
   *
   * The return value of this function can be turned into an object using Object.fromEntries.
   *
   * @returns List of all currently stored pings in ascending order by date.
   */
  async getAllPings(): Promise<[ string, PingInternalRepresentation ][]> {
    const allStoredPings = await this.store.get();
    const finalPings: { [ident: string]: PingInternalRepresentation } = {};
    if (isObject(allStoredPings)) {
      for (const identifier in allStoredPings) {
        const ping = allStoredPings[identifier];
        if (isValidPingInternalRepresentation(ping)) {
          finalPings[identifier] = ping;
        } else {
          log(
            LOG_TAG,
            `Unexpected data found in pings database: ${JSON.stringify(ping, null, 2)}. Deleting.`,
            LoggingLevel.Warn
          );
          await this.store.delete([identifier]);
        }
      }
    }

    return Object.entries(finalPings)
      .sort(([_idA, { collectionDate: dateA }], [_idB, { collectionDate: dateB }]): number => {
        const timeA = (new Date(dateA)).getTime();
        const timeB = (new Date(dateB)).getTime();
        return timeA - timeB;
      });
  }

  /**
   * Delete surplus of pings in the database by count or database size
   * and return list of remaining pings. Pings are deleted from oldest to newest.
   *
   * The size of the database will be calculated
   * (by accumulating each ping's size in bytes)
   * and in case the quota is exceeded, outstanding pings get deleted.
   *
   * Note: `deletion-request` pings are never deleted.
   *
   * @param maxCount The max number of pings in the database. Default: 250.
   * @param maxSize The max size of the database (in bytes). Default: 10MB.
   * @returns List of all currently stored pings, in ascending order by date.
   *          `deletion-request` pings are always in the front of the list.
   */
  private async getAllPingsWithoutSurplus(
    maxCount = 250,
    maxSize = 10 * 1024 * 1024, // 10MB
  ): Promise<[ string, PingInternalRepresentation ][]> {
    const allPings = await this.getAllPings();
    // Separate deletion-request from other pings.
    const pings = allPings
      .filter(([_, ping]) => !isDeletionRequest(ping))
      // We need to calculate the size of the pending pings database
      // and delete the **oldest** pings in case quota is reached.
      // So, we sort them in descending order (newest -> oldest).
      .reverse();
    const deletionRequestPings = allPings.filter(([_, ping]) => isDeletionRequest(ping));

    const total = pings.length;
    // TODO (bug 1722682): Record `glean.pending_pings` metric.
    if (total > maxCount) {
      log(
        LOG_TAG,
        [
          `More than ${maxCount} pending pings in the pings database,`,
          `will delete ${total - maxCount} old pings.`
        ],
        LoggingLevel.Warn
      );
    }

    let deleting = false;
    let pendingPingsCount = 0;
    let pendingPingsDatabaseSize = 0;
    const remainingPings: [ string, PingInternalRepresentation ][] = [];
    for (const [identifier, ping] of pings) {
      pendingPingsCount++;
      pendingPingsDatabaseSize += getPingSize(ping);

      if (!deleting && pendingPingsDatabaseSize > maxSize) {
        log(
          LOG_TAG,
          [
            `Pending pings database has reached the size quota of ${maxSize} bytes,`,
            "outstanding pings will be deleted."
          ],
          LoggingLevel.Warn
        );
        deleting = true;
      }

      // Once we reach the number of allowed pings we start deleting,
      // no matter what size. We already log this before the loop.
      if (pendingPingsCount > maxCount) {
        deleting = true;
      }

      if (deleting) {
        // Delete ping from database.
        await this.deletePing(identifier);

        // TODO (bug 1722685): Record `deleted_pings_after_quota_hit` metric.
      } else {
        // Add pings in reverse order so the final array is in ascending order again.
        remainingPings.unshift([identifier, ping]);
      }
    }

    // TODO(bug 1722686): Record `pending_pings_directory_size` metric.

    // Return pings to original order.
    return [ ...deletionRequestPings, ...remainingPings ];
  }

  /**
   * Scans the database for pending pings and enqueues them.
   *
   * # Important
   *
   * This function will also clear off pings in case
   * the database is exceeding the ping or size quota.
   */
  async scanPendingPings(): Promise<void> {
    // If there's no observer, then there's no point in iterating.
    if (!this.observer) {
      return;
    }

    const pings = await this.getAllPingsWithoutSurplus();
    for (const [identifier, ping] of pings) {
      // Notify the observer that a new ping has been added to the pings database.
      this.observer.update(identifier, ping);
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
