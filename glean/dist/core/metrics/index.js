import { Context } from "../context.js";
import { isUndefined, testOnlyCheck } from "../utils.js";
import { getValidDynamicLabel, getValidDynamicLabelSync } from "./types/labeled.js";
export class MetricType {
    constructor(type, meta, metricCtor) {
        if (metricCtor) {
            Context.addSupportedMetric(type, metricCtor);
        }
        this.type = type;
        this.name = meta.name;
        this.category = meta.category;
        this.sendInPings = meta.sendInPings;
        this.lifetime = meta.lifetime;
        this.disabled = meta.disabled;
        this.dynamicLabel = meta.dynamicLabel;
    }
    baseIdentifier() {
        if (this.category.length > 0) {
            return `${this.category}.${this.name}`;
        }
        else {
            return this.name;
        }
    }
    async identifier() {
        const baseIdentifier = this.baseIdentifier();
        if (!isUndefined(this.dynamicLabel)) {
            return await getValidDynamicLabel(this);
        }
        else {
            return baseIdentifier;
        }
    }
    identifierSync() {
        const baseIdentifier = this.baseIdentifier();
        if (!isUndefined(this.dynamicLabel)) {
            return getValidDynamicLabelSync(this);
        }
        else {
            return baseIdentifier;
        }
    }
    shouldRecord(uploadEnabled) {
        return uploadEnabled && !this.disabled;
    }
    async testGetNumRecordedErrors(errorType, ping = this.sendInPings[0]) {
        if (testOnlyCheck("testGetNumRecordedErrors")) {
            return Context.errorManager.testGetNumRecordedErrors(this, errorType, ping);
        }
        return 0;
    }
}
