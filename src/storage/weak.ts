/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Store, StorageIndex, StorageValue, StorageObject } from "storage";
import { updateNestedObject, getValueFromNestedObject, deleteKeyFromNestedObject } from "storage/utils";

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

  async _getWholeStore(): Promise<StorageObject> {
    return this.store;
  }

  async get(index: StorageIndex): Promise<StorageValue> {
    return getValueFromNestedObject(this.store, index);
  }

  async update(
    index: StorageIndex,
    transformFn: (v: StorageValue) => Exclude<StorageValue, undefined>
  ): Promise<void> {
    this.store = updateNestedObject(this.store, index, transformFn);
  }

  async delete(index: StorageIndex): Promise<void> {
    try {
      this.store = deleteKeyFromNestedObject(this.store, index);
    } catch (e) {
      console.warn(e.message, "Ignoring.");
    }
  }
}

export default WeakStore;
