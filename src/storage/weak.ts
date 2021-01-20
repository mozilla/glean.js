/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Store, StorageIndex } from "storage";
import { updateNestedObject, getValueFromNestedObject, deleteKeyFromNestedObject } from "storage/utils";
import { JSONObject, JSONValue } from "utils";

/**
 * A weak implementation for the Store interface.
 *
 * This means the data saved in this store does not persist throughout application runs.
 */
class WeakStore implements Store {
  private store: JSONObject;

  // If we don't include these arguments here, the typescript checker will raise
  // `TS2554: Expected 0 arguments, but got 1.`.
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_store: string) {
    this.store = {};
  }

  async _getWholeStore(): Promise<JSONObject> {
    return this.store;
  }

  async get(index: StorageIndex): Promise<JSONValue | undefined> {
    return getValueFromNestedObject(this.store, index);
  }

  async update(
    index: StorageIndex,
    transformFn: (v?: JSONValue) => JSONValue
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
