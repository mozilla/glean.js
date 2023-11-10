/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { StorageIndex } from "../../core/storage.js";
import type Store from "../../core/storage.js";

import log, { LoggingLevel } from "../../core/log.js";
import { updateNestedObject, getValueFromNestedObject, deleteKeyFromNestedObject } from "../../core/storage.js";
import type { JSONObject, JSONValue } from "../../core/utils.js";

const LOG_TAG = "platform.test.Storage";

// Enable storing the data outside of `MockStore` instances to simulate the
// behaviour of the other persistent storages.
let globalStore: JSONObject = {};

/**
 * A weak implementation for the Store interface.
 *
 * This means the data saved in this store does not persist throughout application runs.
 * However, data can be shared across two instances of the store.
 */
class MockStore implements Store {
  private rootKey: string;

  constructor(rootKey: string) {
    this.rootKey = rootKey;
  }

  get(index: StorageIndex = []): JSONValue | undefined {
    try {
      const value = getValueFromNestedObject(globalStore, [ this.rootKey, ...index ]);
      return value;
    } catch(e) {
      throw e;
    }
  }

  update(
    index: StorageIndex,
    transformFn: (v?: JSONValue) => JSONValue
  ): void {
    try {
      globalStore = updateNestedObject(globalStore, [ this.rootKey, ...index ], transformFn);
      return;
    } catch(e) {
      throw e;
    }
  }

  delete(index: StorageIndex): void {
    try {
      globalStore = deleteKeyFromNestedObject(globalStore, [ this.rootKey, ...index ]);
    } catch (e) {
      log(
        LOG_TAG,
        [`Error attempting to delete key ${index.toString()} from storage. Ignoring.`, e],
        LoggingLevel.Warn
      );
    }
    return;
  }
}
export default MockStore;
