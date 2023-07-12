import log, { LoggingLevel } from "../../../core/log.js";
import { updateNestedObject, getValueFromNestedObject, deleteKeyFromNestedObject } from "../../../core/storage/utils.js";
import { isJSONValue, isObject } from "../../../core/utils.js";
const LOG_TAG = "platform.webext.Storage";
function stripNulls(query) {
    for (const key in query) {
        const curr = query[key];
        if (curr === null) {
            delete query[key];
        }
        if (isObject(curr)) {
            if (Object.keys(curr).length === 0) {
                delete query[key];
            }
            else {
                stripNulls(curr);
            }
        }
    }
}
class WebExtStore {
    constructor(rootKey) {
        if (typeof browser === "undefined") {
            throw Error(`The web extensions store should only be user in a browser extension context.
        If running is a browser different from Firefox, make sure you have installed
        the webextension-polyfill peer dependency. To do so, run \`npm i webextension-polyfill\`.`);
        }
        if (typeof browser.storage.local === "undefined") {
            throw Error(`Unable to access web extension storage.
        This is probably happening due to missing \`storage\` API permissions.
        Make sure this permission was set on the manifest.json file.`);
        }
        this.store = browser.storage.local;
        this.rootKey = rootKey;
        this.logTag = `${LOG_TAG}.${rootKey}`;
    }
    async getWholeStore() {
        const result = await this.store.get({ [this.rootKey]: {} });
        return result[this.rootKey];
    }
    buildQuery(index) {
        let query = null;
        for (const key of [this.rootKey, ...index].reverse()) {
            query = { [key]: query };
        }
        return query;
    }
    async buildQueryFromStore(transformFn) {
        const store = await this.getWholeStore();
        return { [this.rootKey]: transformFn(store) };
    }
    async get(index = []) {
        const query = this.buildQuery(index);
        const response = await this.store.get(query);
        stripNulls(response);
        if (!response) {
            return;
        }
        if (isJSONValue(response)) {
            if (isObject(response)) {
                return getValueFromNestedObject(response, [this.rootKey, ...index]);
            }
            else {
                return response;
            }
        }
        log(this.logTag, [
            `Unexpected value found in storage for index ${JSON.stringify(index)}. Ignoring.
        ${JSON.stringify(response, null, 2)}`
        ], LoggingLevel.Warn);
    }
    async update(index, transformFn) {
        if (index.length === 0) {
            throw Error("The index must contain at least one property to update.");
        }
        const query = await this.buildQueryFromStore((store) => updateNestedObject(store, index, transformFn));
        return this.store.set(query);
    }
    async delete(index) {
        try {
            const query = await this.buildQueryFromStore((store) => deleteKeyFromNestedObject(store, index));
            return this.store.set(query);
        }
        catch (e) {
            log(this.logTag, [`Error attempting to delete key ${index.toString()} from storage. Ignoring.`, e], LoggingLevel.Warn);
        }
    }
}
export default WebExtStore;
