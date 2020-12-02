/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The storage index is an ordered list of keys to navigate on the store
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

/**
 * The possible values to be retrievd from storage.
 */
export type StorageValue = undefined | string | StorageObject;
export interface StorageObject {
  [key: string]: StorageValue;
}

export interface Store {
  /**
   * Gets the value recorded to the given index on the store.
   *
   * @param index [optional] The index  of the entry we want to delete.
   *
   * @returns The value found for the given index on the storage.
   *          If no index is given, the whole store is returned.
   */
  get(index?: StorageIndex): Promise<StorageValue>;

  /**
   * Updates a specific entry from the store.
   *
   * # Rejects
   *
   * - In case the index in an empty array.
   *
   * # Note
   *
   * If intermediary steps of the given index already contain stored (string or undefined),
   * this data will be overwritten.
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
   * @param index The index  of the entry we want to delete.
   * @param transformFn A transformation function to apply to the currently persisted value.
   */
  update(
    index: StorageIndex,
    transformFn: (v: StorageValue) => Exclude<StorageValue, undefined>
  ): Promise<void>;

  /**
   * Deletes a specific entry from the store.
   *
   * @param index The index of the entry we want to delete.
   *              If given an empty index, will delete all entries on the store.
   */
  delete(index: StorageIndex): Promise<void>;
}
