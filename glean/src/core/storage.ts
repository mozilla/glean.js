/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSONObject, JSONValue } from "./utils.js";
import { isJSONValue, isObject } from "./utils.js";

export type StorageIndex = string[];

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
export default interface Store {
  /**
   * Gets the value recorded to the given index on the store.
   *
   * @param index The index  of the entry to get. If the index is empty,
   *        the whole store is returned.
   * @returns The value found for the given index on the storage.
   *          In case nothing has been recorded on the given index, returns `undefined`.
   * @throws In case an value which is not valid JSON is found.
   */
  get(index?: StorageIndex): JSONValue | undefined;

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
  update(index: StorageIndex, transformFn: (v?: JSONValue) => JSONValue): void;

  /**
   * Deletes a specific entry from the store.
   *
   * @param index The index of the entry we want to delete.
   *        If given an empty array as index, will delete all entries on the store.
   */
  delete(index: StorageIndex): void;
}

/// UTILS ///
/**
 * Gets an entry in a given object on a given index.
 *
 * @param obj The object to update
 * @param index The index of the entry to update
 * @returns The value of the entry if any was found and `undefined` otherwise.
 * @throws In case the index is an empty array.
 */
export function getValueFromNestedObject(obj: JSONObject, index: StorageIndex): JSONValue | undefined {
  if (index.length === 0) {
    throw Error("The index must contain at least one property to get.");
  }

  let target: JSONValue = obj;
  for (const key of index) {
    if (isObject(target) && key in target) {
      const temp: unknown = target[key];
      if (isJSONValue(temp)) {
        target = temp;
      }
    } else {
      // Bailing out because the full target path doesn't exist.
      return;
    }
  }

  return target;
}

/**
 * Updates / Adds an entry in a given object on a given index.
 *
 * # Important
 *
 * Any errors thrown on a transformation function are bubbled up.
 *
 * Remember to take in to account that storage may not contain
 * the data we expect it to, so always validate the type of
 * the value passed on to the transformation function.
 *
 * @param obj The object to update
 * @param index The index of the entry to update
 * @param transformFn A transformation function to apply to the currently persisted value.
 * @returns An updated copy of the object.
 */
export function updateNestedObject(
  obj: JSONObject,
  index: StorageIndex,
  transformFn: (v?: JSONValue) => JSONValue
): JSONObject {
  if (index.length === 0) {
    throw Error("The index must contain at least one property to update.");
  }

  const returnObject = { ...obj };
  let target = returnObject;

  // Loops through all the keys but the last.
  // The last is the key we will **set**, not **get**.
  for (const key of index.slice(0, index.length - 1)) {
    if (!isObject(target[key])) {
      target[key] = {};
    }

    // Typescript throws an error below about not being able to
    // set target to target[key] because it may not be a JSONObject.
    // We make sure by the above conditional that target[key] is a JSONObject,
    // thus we can safely ignore Typescripts concerns.
    //
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    target = target[key];
  }

  const finalKey = index[index.length - 1];
  const current = target[finalKey];

  const value = transformFn(current);
  target[finalKey] = value;
  return returnObject;
}

/**
 * Deletes an entry in a given object on a given index.
 *
 * No-op in case the index is not found.
 *
 * @param obj The object to update
 * @param index The index of the entry to delete
 * @returns An updated copy of the object.
 * @throws In case the index is invalid i.e. doesn't contain an entry or doesn't exist.
 */
export function deleteKeyFromNestedObject(obj: JSONObject, index: StorageIndex): JSONObject {
  if (index.length === 0) {
    return {};
  }

  const returnObject = { ...obj };
  let target = returnObject;

  // Loops through all the keys but the last.
  // The last is the key we will **delete**, not **get**.
  for (const key of index.slice(0, index.length - 1)) {
    const value = target[key];
    if (!isObject(value)) {
      throw Error(`Attempted to delete an entry from an inexistent index: ${JSON.stringify(index)}.`);
    } else {
      target = value;
    }
  }

  const finalKey = index[index.length - 1];
  delete target[finalKey];
  return returnObject;
}
