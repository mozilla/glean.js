/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { StorageIndex } from "../storage/index.js";
import type { JSONObject, JSONValue } from "../utils.js";
import { isJSONValue, isObject } from "../utils.js";

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
 * @param obj The object to update
 * @param index The index of the entry to update
 * @param transformFn A transformation function to apply to the currently persisted value.
 * @returns An updated copy of the object.
 * @throws In case the index is an empty array.
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
  try {
    const value = transformFn(current);
    target[finalKey] = value;
    return returnObject;
  } catch(e) {
    console.error("Error while transforming stored value. Ignoring old value.", e);
    target[finalKey] = transformFn(undefined);
    return returnObject;
  }
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
      throw Error("Attempted to delete an entry from an invalid index.");
    } else {
      target = value;
    }
  }

  const finalKey = index[index.length - 1];
  delete target[finalKey];
  return returnObject;
}
