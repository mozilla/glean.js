/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { OptionalAsync } from "../types";
import type { JSONValue } from "../utils";

/**
 * The storage index in the ordered list of keys to navigate on the store
 * to reach a specific entry.
 *
 * # Example
 *
 * For the index ["user", "baseline", "boolean", "tab.click"],
 * we would search for the following entry:
 *
 * {
 *   "user": {
 *      "baseline": {
 *        "boolean": {
 *          "tab.click": <This is the value we are looking for!>
 *        }
 *      }
 *   }
 * }
 */
export type StorageIndex = string[];

export interface IStore {
  /**
   * Gets the value recorded to the given index on the store.
   *
   * @param index The index  of the entry to get. If the index is empty,
   *        the whole store is returned.
   * @returns The value found for the given index on the storage.
   *          In case nothing has been recorded on the given index, returns `undefined`.
   * @throws In case an value which is not valid JSON is found.
   */
  get(index?: StorageIndex): OptionalAsync<JSONValue | undefined>;

  /**
   * Updates a specific entry from the store.
   *
   * # Note
   *
   * If intermediary steps of the given index already contains a string,
   * it will be overwritten.
   *
   * For example, if you attempt to update something under the index ["foo", "bar"]
   * and the storage currently contains the following data:
   *
   * ```json
   * {
   *  "foo": "some value"
   * }
   * ```
   * It will be overwritten like so:
   *
   * ``json
   * {
   *  "foo": {
   *    "bar": "new value!"
   *  }
   * }
   * ```
   *
   * @param index The index  of the entry to update.
   * @param transformFn A transformation function to apply to the currently persisted value.
   *
   * @throws In case the index is an empty array.
   */
  update(index: StorageIndex, transformFn: (v?: JSONValue) => JSONValue): OptionalAsync<void>;

  /**
   * Deletes a specific entry from the store.
   *
   * @param index The index of the entry we want to delete.
   *        If given an empty array as index, will delete all entries on the store.
   */
  delete(index: StorageIndex): OptionalAsync<void>;
}
