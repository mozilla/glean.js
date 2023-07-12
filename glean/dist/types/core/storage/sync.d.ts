import type { JSONValue } from "../utils";
import type { IStore, StorageIndex } from "./shared";
export default interface SynchronousStore extends IStore {
    get(index?: StorageIndex): JSONValue | undefined;
    update(index: StorageIndex, transformFn: (v?: JSONValue) => JSONValue): void;
    delete(index: StorageIndex): void;
}
