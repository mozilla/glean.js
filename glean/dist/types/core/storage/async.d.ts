import type { JSONValue } from "../utils";
import type { IStore, StorageIndex } from "./shared";
export default interface Store extends IStore {
    get(index?: StorageIndex): Promise<JSONValue | undefined>;
    update(index: StorageIndex, transformFn: (v?: JSONValue) => JSONValue): Promise<void>;
    delete(index: StorageIndex): Promise<void>;
}
