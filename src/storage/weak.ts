/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Store, StorageIndex, StorageValue, StorageObject } from "storage";
import { isString, isUndefined, isObject } from "utils";

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

  async _testOnly_getWholeStore(): Promise<StorageObject> {
    return this.store;
  }

  async get(index: StorageIndex): Promise<StorageValue> {
    if (index.length === 0) {
      throw Error("The index must contain at least one property to get.");
    }

    let target: StorageValue = this.store;
    for (const key of index) {
      if (!isUndefined(target) && !isString(target) && key in target) {
        target = target[key];
      } else {
        // Bailing out because the full target path doesn't exist.
        return;
      }
    }

    return target;
  }

  async update(
    index: StorageIndex,
    transformFn: (v: StorageValue) => Exclude<StorageValue, undefined>
  ): Promise<void> {
    if (index.length === 0) {
      throw Error("The index must contain at least one property to update.");
    }

    let target = this.store;

    // Loops through all the keys but the last.
    // The last is the key we will **set**, not **get**.
    for (const key of index.slice(0, index.length - 1)) {
      if (!isObject(target[key])) {
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

    return;
  }

  async delete(index: StorageIndex): Promise<void> {
    if (index.length === 0) {
      this.store = {};
      return;
    }

    let target = this.store;

    // Loops through all the keys but the last.
    // The last is the key we will **delete**, not **get**.
    for (const key of index.slice(0, index.length - 1)) {
      const value = target[key];
      if (!isObject(value)) {
        console.warn("Attempted to delete an entry from an invalid index. Ignoring.");
        return;
      } else {
        target = value;
      }
    }

    const finalKey = index[index.length - 1];
    delete target[finalKey];
    return;
  }
}

export default WeakStore;
