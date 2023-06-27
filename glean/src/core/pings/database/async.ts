/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Store from "../../storage/async.js";
import type { JSONObject } from "../../utils.js";
import type {
  IPingDatabase,
  Observer,
  PingArray,
  PingInternalRepresentation,
  PingMap
} from "./shared.js";

import { isObject } from "../../utils.js";
import log, { LoggingLevel } from "../../log.js";
import { Context } from "../../context.js";
import {
  getPingSize,
  isDeletionRequest,
  isValidPingInternalRepresentation,
  PINGS_DATABASE_LOG_TAG,
  sortPings
} from "./shared.js";

// See `IPingDatabase` for method documentation.
class PingsDatabase implements IPingDatabase {
  private store: Store;
  private observer?: Observer;

  constructor() {
    this.store = new Context.platform.Storage("pings") as Store;
  }

  attachObserver(observer: Observer): void {
    this.observer = observer;
  }

  async recordPing(
    path: string,
    identifier: string,
    payload: JSONObject,
    headers?: Record<string, string>
  ): Promise<void> {
    const ping: PingInternalRepresentation = {
      collectionDate: new Date().toISOString(),
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

  async deletePing(identifier: string): Promise<void> {
    await this.store.delete([identifier]);
  }

  async getAllPings(): Promise<PingArray> {
    const allStoredPings = await this.store.get();
    const finalPings: PingMap = {};
    if (isObject(allStoredPings)) {
      for (const identifier in allStoredPings) {
        const ping = allStoredPings[identifier];
        if (isValidPingInternalRepresentation(ping)) {
          finalPings[identifier] = ping;
        } else {
          log(
            PINGS_DATABASE_LOG_TAG,
            `Unexpected data found in pings database: ${JSON.stringify(ping, null, 2)}. Deleting.`,
            LoggingLevel.Warn
          );
          await this.store.delete([identifier]);
        }
      }
    }

    return sortPings(finalPings);
  }

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

  async clearAll(): Promise<void> {
    await this.store.delete([]);
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
    maxSize = 10 * 1024 * 1024 // 10MB
  ): Promise<PingArray> {
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
        PINGS_DATABASE_LOG_TAG,
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
    const remainingPings: PingArray = [];
    for (const [identifier, ping] of pings) {
      pendingPingsCount++;
      pendingPingsDatabaseSize += getPingSize(ping);

      if (!deleting && pendingPingsDatabaseSize > maxSize) {
        log(
          PINGS_DATABASE_LOG_TAG,
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
    return [...deletionRequestPings, ...remainingPings];
  }
}

export default PingsDatabase;
