import type { StorageIndex } from "../storage/shared.js";
import type { JSONObject, JSONValue } from "../utils.js";
/**
 * Gets an entry in a given object on a given index.
 *
 * @param obj The object to update
 * @param index The index of the entry to update
 * @returns The value of the entry if any was found and `undefined` otherwise.
 * @throws In case the index is an empty array.
 */
export declare function getValueFromNestedObject(obj: JSONObject, index: StorageIndex): JSONValue | undefined;
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
export declare function updateNestedObject(obj: JSONObject, index: StorageIndex, transformFn: (v?: JSONValue) => JSONValue): JSONObject;
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
export declare function deleteKeyFromNestedObject(obj: JSONObject, index: StorageIndex): JSONObject;
