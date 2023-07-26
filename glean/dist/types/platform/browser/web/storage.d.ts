import type SynchronousStore from "../../../core/storage/sync.js";
import type { StorageIndex } from "../../../core/storage/shared.js";
import type { JSONValue } from "../../../core/utils.js";
declare class WebStore implements SynchronousStore {
    private rootKey;
    private logTag;
    constructor(rootKey: string);
    get(index?: StorageIndex): JSONValue | undefined;
    update(index: StorageIndex, transformFn: (v?: JSONValue) => JSONValue): void;
    delete(index: StorageIndex): void;
}
export default WebStore;
