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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_store: string) {
    this.store = {};
  }

  _getWholeStore(): Promise<JSONObject> {
    return Promise.resolve(this.store);
  }

  get(index: StorageIndex): Promise<JSONValue | undefined> {
    try {
      const value = getValueFromNestedObject(this.store, index);
      return Promise.resolve(value);
    } catch(e) {
      return Promise.reject(e);
    }
  }

  update(
    index: StorageIndex,
    transformFn: (v?: JSONValue) => JSONValue
  ): Promise<void> {
    try {
      this.store = updateNestedObject(this.store, index, transformFn);
      return Promise.resolve();
    } catch(e) {
      return Promise.reject(e);
    }
  }

  delete(index: StorageIndex): Promise<void> {
    try {
      this.store = deleteKeyFromNestedObject(this.store, index);
    } catch (e) {
      console.warn((e as Error).message, "Ignoring.");
    }
    return Promise.resolve();
  }
}
export default WeakStore;
