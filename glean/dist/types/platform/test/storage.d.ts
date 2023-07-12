import type { StorageIndex } from "../../core/storage/shared.js";
import type Store from "../../core/storage/async.js";
import type { JSONValue } from "../../core/utils.js";
/**
 * A weak implementation for the Store interface.
 *
 * This means the data saved in this store does not persist throughout application runs.
 * However, data can be shared across two instances of the store.
 */
declare class MockStore implements Store {
    private rootKey;
    constructor(rootKey: string);
    get(index?: StorageIndex): Promise<JSONValue | undefined>;
    update(index: StorageIndex, transformFn: (v?: JSONValue) => JSONValue): Promise<void>;
    delete(index: StorageIndex): Promise<void>;
}
export default MockStore;
