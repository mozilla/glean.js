import { isJSONValue, isObject } from "../utils.js";
export function getValueFromNestedObject(obj, index) {
    if (index.length === 0) {
        throw Error("The index must contain at least one property to get.");
    }
    let target = obj;
    for (const key of index) {
        if (isObject(target) && key in target) {
            const temp = target[key];
            if (isJSONValue(temp)) {
                target = temp;
            }
        }
        else {
            return;
        }
    }
    return target;
}
export function updateNestedObject(obj, index, transformFn) {
    if (index.length === 0) {
        throw Error("The index must contain at least one property to update.");
    }
    const returnObject = { ...obj };
    let target = returnObject;
    for (const key of index.slice(0, index.length - 1)) {
        if (!isObject(target[key])) {
            target[key] = {};
        }
        target = target[key];
    }
    const finalKey = index[index.length - 1];
    const current = target[finalKey];
    const value = transformFn(current);
    target[finalKey] = value;
    return returnObject;
}
export function deleteKeyFromNestedObject(obj, index) {
    if (index.length === 0) {
        return {};
    }
    const returnObject = { ...obj };
    let target = returnObject;
    for (const key of index.slice(0, index.length - 1)) {
        const value = target[key];
        if (!isObject(value)) {
            throw Error(`Attempted to delete an entry from an inexistent index: ${JSON.stringify(index)}.`);
        }
        else {
            target = value;
        }
    }
    const finalKey = index[index.length - 1];
    delete target[finalKey];
    return returnObject;
}
