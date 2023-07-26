import type { StorageIndex } from "../../../core/storage/shared.js";
import type Store from "../../../core/storage/async.js";
import type { JSONValue } from "../../../core/utils.js";
/**
 * Persistent storage implementation based on the Promise-based
 * [storage API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage)
 * for web extensions.
 *
 * To make sure this implementation works on Chromium based browsers, the user must install the peer dependency
 * [`mozilla/webextension-polyfill`](https://github.com/mozilla/webextension-polyfill).
 */
declare class WebExtStore implements Store {
    private store;
    private logTag;
    private rootKey;
    constructor(rootKey: string);
    private getWholeStore;
    /**
     * Build a query object to retrieve / update a given entry from the storage.
     *
     * @param index The index to the given entry on the storage.
     * @returns The query object.
     */
    private buildQuery;
    /**
     * Retrieves the full store and builds a query object on top of it.
     *
     * @param transformFn The transformation function to apply to the store.
     * @returns The query object with the modified store.
     */
    private buildQueryFromStore;
    get(index?: StorageIndex): Promise<JSONValue | undefined>;
    update(index: StorageIndex, transformFn: (v?: JSONValue) => JSONValue): Promise<void>;
    delete(index: StorageIndex): Promise<void>;
}
export default WebExtStore;
