/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import log, { LoggingLevel } from "../../core/log.js";
import type { StorageIndex } from "../../core/storage/index.js";
import type Store from "../../core/storage/index.js";
import { updateNestedObject, getValueFromNestedObject, deleteKeyFromNestedObject } from "../../core/storage/utils.js";
import type { JSONArray, JSONObject, JSONPrimitive, JSONValue } from "../../core/utils.js";
import { isJSONValue, isObject } from "../../core/utils.js";

const LOG_TAG = "platform.webext.Storage";

type WebExtStoreQuery = { [x: string]: WebExtStoreQuery | JSONPrimitive | JSONArray | null; };

/**
 * Strips all properties whose values are `null` from a WebExtStoreQuery.
 *
 * The `null` values are the ones which were not found,
 * thus can be safely removed.
 *
 * # Important
 *
 * This modifies the original object.
 *
 * @param query The query we want to strip of null values.
 */
function stripNulls(query: WebExtStoreQuery) {
  for (const key in query) {
    const curr = query[key];
    if (curr === null) {
      delete query[key];
    }

    if (isObject(curr)) {
      if (Object.keys(curr).length === 0) {
        delete query[key];
      } else {
        stripNulls(curr);
      }
    }
  }
}

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
  private logTag: string;

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
    this.logTag = `${LOG_TAG}.${rootKey}`;
  }

  async _getWholeStore(): Promise<JSONObject> {
    const result = await this.store.get({ [this.rootKey]: {} });
    return result[this.rootKey];
  }

  /**
   * Build a query object to retrieve / update a given entry from the storage.
   *
   * @param index The index to the given entry on the storage.
   * @returns The query object.
   */
  private _buildQuery(index: StorageIndex): WebExtStoreQuery {
    let query = null;
    for (const key of [ this.rootKey, ...index].reverse()) {
      query = { [key]: query };
    }

    return <WebExtStoreQuery>query;
  }

  /**
   * Retrieves the full store and builds a query object on top of it.
   *
   * @param transformFn The transformation function to apply to the store.
   * @returns The query object with the modified store.
   */
  private async _buildQueryFromStore(transformFn: (s: JSONObject) => JSONObject): Promise<JSONObject> {
    const store = await this._getWholeStore();
    return { [this.rootKey]: transformFn(store) };
  }

  async get(index: StorageIndex): Promise<JSONValue | undefined> {
    const query = this._buildQuery(index);
    const response = await this.store.get(query);
    stripNulls(response);
    if (!response) {
      return;
    }

    if (isJSONValue(response)) {
      if (isObject(response)) {
        return getValueFromNestedObject(<JSONObject>response, [ this.rootKey, ...index ]);
      } else {
        return response;
      }
    }

    log(
      this.logTag,
      [
        `Unexpected value found in storage for index ${JSON.stringify(index)}. Ignoring.
        ${JSON.stringify(response, null, 2)}`
      ],
      LoggingLevel.Warn
    );
  }

  async update(
    index: StorageIndex,
    transformFn: (v?: JSONValue) => JSONValue
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
      log(this.logTag, ["Ignoring key", JSON.stringify(e)], LoggingLevel.Warn);
    }
  }
}

export default WebExtStore;
