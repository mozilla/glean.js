/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Store, StorageIndex, StorageValue, StorageObject } from "storage";

/**
 * A weak implementation for the Store interface.
 *
 * This means the data saved in this store does not persist throughout application runs.
 */
class WeakStore implements Store {
  private store: StorageObject;

  constructor() {
    this.store = {};
  }

  /**
   * Gets the value recorded to the given index on the store.
   *
   * @param index [optional] The index  of the entry we want to delete.
   *
   * @returns The value found for the given index on the storage.
   *          If no index is given, the whole store is returned.
   */
  get(index?: StorageIndex): Promise<StorageValue> {
    return new Promise(resolve => {
      if (!index) return this.store;

      let target: StorageValue = this.store;
      for (const key of index) {
        if (typeof target !== "undefined" && typeof target !== "string" && key in target) {
          target = target[key];
        } else {
          resolve();
        }
      }

      resolve(target);
    });
  }

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
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (index.length === 0) {
        reject(Error("The index must contain at least one property to update."));
      }

      let target = this.store;

      // Loops through all the keys but the last.
      // The last is the key we will **set**, not **get**.
      for (const key of index.slice(0, index.length - 1)) {
        if (typeof target[key] == "undefined" || typeof target[key] == "string") {
          target[key] = {};
        }

        // Typescript throws an error below about not being able to
        // set target to target[key] because it may not be a StorageObject.
        // We make sure by the above conditional that target[key] is a StorageObject,
        // thus we can safely ignore Typescripts concerns.
        //
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        target = target[key];
      }

      const finalKey = index[index.length - 1];
      const current = target[finalKey];
      target[finalKey] = transformFn(current);
      resolve();
    });
  }

  /**
   * Deletes a specific entry from the store.
   *
   * @param index The index of the entry we want to delete.
   *              If given an empty index, will delete all entries on the store.
   */
  delete(index: StorageIndex): Promise<void> {
    return new Promise(resolve => {
      if (index.length === 0) {
        this.store = {};
        resolve();
      }

      let target = this.store;

      // Loops through all the keys but the last.
      // The last is the key we will **delete**, not **get**.
      for (const key of index.slice(0, index.length - 1)) {
        const value = target[key];
        if (typeof value === "undefined" || typeof value === "string") {
          console.warn("Attempted to delete an entry from an invalid index. Ignoring.");
          resolve();
        } else {
          target = value;
        }
      }

      const finalKey = index[index.length - 1];
      delete target[finalKey];
      resolve();
    });
  }
}

export default WeakStore;
