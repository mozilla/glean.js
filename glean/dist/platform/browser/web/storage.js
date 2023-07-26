import log, { LoggingLevel } from "../../../core/log.js";
import { deleteKeyFromNestedObject, getValueFromNestedObject, updateNestedObject } from "../../../core/storage/utils.js";
import { isWindowObjectUnavailable } from "../../../core/utils.js";
const LOG_TAG = "platform.web.Storage";
class WebStore {
    constructor(rootKey) {
        this.rootKey = rootKey;
        this.logTag = `${LOG_TAG}.${rootKey}`;
    }
    get(index = []) {
        if (isWindowObjectUnavailable()) {
            return;
        }
        let result;
        try {
            const json = localStorage.getItem(this.rootKey) || "{}";
            const obj = JSON.parse(json);
            if (index.length > 0) {
                result = getValueFromNestedObject(obj, index);
            }
            else {
                result = Object.keys(obj).length === 0 ? undefined : obj;
            }
        }
        catch (err) {
            log(LOG_TAG, ["Unable to fetch value from local storage.", err], LoggingLevel.Error);
        }
        return result;
    }
    update(index, transformFn) {
        if (isWindowObjectUnavailable()) {
            return;
        }
        try {
            const json = localStorage.getItem(this.rootKey) || "{}";
            const obj = JSON.parse(json);
            const updatedObj = updateNestedObject(obj, index, transformFn);
            localStorage.setItem(this.rootKey, JSON.stringify(updatedObj));
        }
        catch (err) {
            log(LOG_TAG, ["Unable to update value from local storage.", err], LoggingLevel.Error);
        }
    }
    delete(index) {
        if (isWindowObjectUnavailable()) {
            return;
        }
        try {
            const json = localStorage.getItem(this.rootKey) || "{}";
            const obj = JSON.parse(json);
            if (index.length === 0) {
                localStorage.removeItem(this.rootKey);
            }
            else {
                try {
                    const updatedObj = deleteKeyFromNestedObject(obj, index);
                    localStorage.setItem(this.rootKey, JSON.stringify(updatedObj));
                }
                catch (e) {
                    log(this.logTag, [`Error attempting to delete key ${index.toString()} from storage. Ignoring.`, e], LoggingLevel.Warn);
                }
            }
        }
        catch (err) {
            log(LOG_TAG, ["Unable to delete value from storage.", err], LoggingLevel.Error);
        }
    }
}
export default WebStore;
