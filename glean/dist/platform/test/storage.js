import log, { LoggingLevel } from "../../core/log.js";
import { updateNestedObject, getValueFromNestedObject, deleteKeyFromNestedObject } from "../../core/storage/utils.js";
const LOG_TAG = "platform.test.Storage";
let globalStore = {};
class MockStore {
    constructor(rootKey) {
        this.rootKey = rootKey;
    }
    get(index = []) {
        try {
            const value = getValueFromNestedObject(globalStore, [this.rootKey, ...index]);
            return Promise.resolve(value);
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    update(index, transformFn) {
        try {
            globalStore = updateNestedObject(globalStore, [this.rootKey, ...index], transformFn);
            return Promise.resolve();
        }
        catch (e) {
            return Promise.reject(e);
        }
    }
    delete(index) {
        try {
            globalStore = deleteKeyFromNestedObject(globalStore, [this.rootKey, ...index]);
        }
        catch (e) {
            log(LOG_TAG, [`Error attempting to delete key ${index.toString()} from storage. Ignoring.`, e], LoggingLevel.Warn);
        }
        return Promise.resolve();
    }
}
export default MockStore;
