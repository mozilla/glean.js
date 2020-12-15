/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Store, StorageIndex, StorageValue, StorageObject, isStorageValue } from "storage";
import { updateNestedObject, getValueFromNestedObject, deleteKeyFromNestedObject } from "storage/utils";
import { isString, isUndefined } from "utils";

type WebExtStoreQuery = { [x: string]: { [x: string]: null; } | null; };

/**
 * Persistent storage implementation based on the Promise-based
 * [storage API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)
 * for web extensions.
 *
 * To make sure this implementation works on Chromium based browsers, the user must install the peer dependency
 * [`mozilla/webextension-polyfill`](https://github.com/mozilla/webextension-polyfill).
 */
class WebExtStore implements Store {
  private store;

  // The main key under which all other entries will be recorded for this store instance.
  private rootKey: string;

  constructor(rootKey: string) {
    if (typeof browser === "undefined") {
      throw Error(
        `The web extensions store should only be user in a browser extension context.
        If running is a browser different from Firefox, make sure you have installed
        the webextension-polyfill peer dependency. To do so, run \`npm i webextension-polyfill\`.`
      );
    }
    this.store = browser.storage.local;
    this.rootKey = rootKey;
  }

  async _getWholeStore(): Promise<StorageObject> {
    const result = await this.store.get({ [this.rootKey]: {} });
    return  result[this.rootKey];
  }

  /**
   * Build a query object to retrieve / update a given entry from the storage.
   *
   * @param index The index to the given entry on the storage.
   *
   * @returns The query object.
   */
  private _buildQuery(index: StorageIndex): WebExtStoreQuery {
    let partialQuery = null;
    for (const key of index) {
      partialQuery = { [key]: partialQuery };
    }

    return { [this.rootKey]: partialQuery };
  }

  /**
   * Retrieves the full store and builds a query object on top of it.
   *
   * @param transformFn The transformation function to apply to the store.
   *
   * @returns The query object with the modified store.
   */
  private async _buildQueryFromStore(transformFn: (s: StorageObject) => StorageObject): Promise<StorageObject> {
    const store = await this._getWholeStore();
    return { [this.rootKey]: transformFn(store) };
  }

  async get(index: StorageIndex): Promise<StorageValue> {
    const query = this._buildQuery(index);
    const response: browser.storage.StorageObject = await this.store.get(query);
    if (!response) {
      return;
    }

    if (isStorageValue(response)) {
      if (!isUndefined(response) && !isString(response)) {
        return getValueFromNestedObject(response, [ this.rootKey, ...index ]);
      } else {
        return response;
      }
    }

    throw new Error(
      `Unexpected value found in storage for index ${index}. Ignoring.
      ${JSON.stringify(response, null, 2)}`
    );
  }

  async update(
    index: StorageIndex,
    transformFn: (v: StorageValue) => Exclude<StorageValue, undefined>
  ): Promise<void> {
    if (index.length === 0) {
      throw Error("The index must contain at least one property to update.");
    }

    // We need to get the full store object here, change it as requested and then re-save.
    // This is necessary, because if we try to set a key to an inside object on the storage,
    // it will erase any sibling keys that are not mentioned.
    const query = await this._buildQueryFromStore(
      store => updateNestedObject(store, index, transformFn)
    );
    return this.store.set(query);
  }

  async delete(index: StorageIndex): Promise<void> {
    // The `remove API`[https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/StorageArea/remove]
    // doesn't expose a way for us to delete nested keys.
    // This means we need to get the whole store,
    // make the necessary changes to it locally and then reset it.
    try {
      const query = await this._buildQueryFromStore(
        store => deleteKeyFromNestedObject(store, index)
      );
      return this.store.set(query);
    } catch(e) {
      console.warn(e.message, "Ignoring");
    }
  }
}

export default WebExtStore;
