import { validateMetricInternalRepresentation } from "../utils.js";
import { isObject, isUndefined } from "../../utils.js";
import log, { LoggingLevel } from "../../log.js";
import { Context } from "../../context.js";
import { createMetricsPayload, METRICS_DATABASE_LOG_TAG, RESERVED_METRIC_IDENTIFIER_PREFIX } from "./shared.js";
class MetricsDatabase {
    constructor() {
        this.userStore = new Context.platform.Storage("userLifetimeMetrics");
        this.pingStore = new Context.platform.Storage("pingLifetimeMetrics");
        this.appStore = new Context.platform.Storage("appLifetimeMetrics");
    }
    async record(metric, value) {
        await this.transform(metric, () => value);
    }
    async transform(metric, transformFn) {
        if (metric.disabled) {
            return;
        }
        const store = this.chooseStore(metric.lifetime);
        const storageKey = await metric.identifier();
        for (const ping of metric.sendInPings) {
            const finalTransformFn = (v) => transformFn(v).get();
            await store.update([ping, metric.type, storageKey], finalTransformFn);
        }
    }
    async hasMetric(lifetime, ping, metricType, metricIdentifier) {
        const store = this.chooseStore(lifetime);
        const value = await store.get([ping, metricType, metricIdentifier]);
        return !isUndefined(value);
    }
    async countByBaseIdentifier(lifetime, ping, metricType, metricIdentifier) {
        const store = this.chooseStore(lifetime);
        const pingStorage = await store.get([ping, metricType]);
        if (isUndefined(pingStorage)) {
            return 0;
        }
        return Object.keys(pingStorage).filter((n) => n.startsWith(metricIdentifier)).length;
    }
    async getMetric(ping, metric) {
        const store = this.chooseStore(metric.lifetime);
        const storageKey = await metric.identifier();
        const value = await store.get([ping, metric.type, storageKey]);
        if (!isUndefined(value) && !validateMetricInternalRepresentation(metric.type, value)) {
            log(METRICS_DATABASE_LOG_TAG, `Unexpected value found for metric ${storageKey}: ${JSON.stringify(value)}. Clearing.`, LoggingLevel.Error);
            await store.delete([ping, metric.type, storageKey]);
            return;
        }
        else {
            return value;
        }
    }
    async getPingMetrics(ping, clearPingLifetimeData) {
        const userData = await this.getCorrectedPingData(ping, "user");
        const pingData = await this.getCorrectedPingData(ping, "ping");
        const appData = await this.getCorrectedPingData(ping, "application");
        if (clearPingLifetimeData && Object.keys(pingData).length > 0) {
            await this.clear("ping", ping);
        }
        const response = {};
        for (const data of [userData, pingData, appData]) {
            for (const metricType in data) {
                for (const metricId in data[metricType]) {
                    if (!metricId.startsWith(RESERVED_METRIC_IDENTIFIER_PREFIX)) {
                        if (metricId.includes("/")) {
                            this.processLabeledMetric(response, metricType, metricId, data[metricType][metricId]);
                        }
                        else {
                            response[metricType] = {
                                ...response[metricType],
                                [metricId]: data[metricType][metricId]
                            };
                        }
                    }
                }
            }
        }
        if (Object.keys(response).length === 0) {
            return;
        }
        else {
            return createMetricsPayload(response);
        }
    }
    async clear(lifetime, ping) {
        const store = this.chooseStore(lifetime);
        const storageIndex = ping ? [ping] : [];
        await store.delete(storageIndex);
    }
    async clearAll() {
        await this.userStore.delete([]);
        await this.pingStore.delete([]);
        await this.appStore.delete([]);
    }
    chooseStore(lifetime) {
        switch (lifetime) {
            case "user":
                return this.userStore;
            case "ping":
                return this.pingStore;
            case "application":
                return this.appStore;
        }
    }
    async getCorrectedPingData(ping, lifetime) {
        const store = this.chooseStore(lifetime);
        const data = await store.get([ping]);
        if (isUndefined(data)) {
            return {};
        }
        if (!isObject(data)) {
            log(METRICS_DATABASE_LOG_TAG, `Invalid value found in storage for ping "${ping}". Deleting.`, LoggingLevel.Debug);
            await store.delete([ping]);
            return {};
        }
        const correctedData = {};
        for (const metricType in data) {
            const metrics = data[metricType];
            if (!isObject(metrics)) {
                log(METRICS_DATABASE_LOG_TAG, `Unexpected data found in storage for metrics of type "${metricType}" in ping "${ping}". Deleting.`, LoggingLevel.Debug);
                await store.delete([ping, metricType]);
                continue;
            }
            for (const metricIdentifier in metrics) {
                if (!validateMetricInternalRepresentation(metricType, metrics[metricIdentifier])) {
                    log(METRICS_DATABASE_LOG_TAG, `Invalid value "${JSON.stringify(metrics[metricIdentifier])}" found in storage for metric "${metricIdentifier}". Deleting.`, LoggingLevel.Debug);
                    await store.delete([ping, metricType, metricIdentifier]);
                    continue;
                }
                if (!correctedData[metricType]) {
                    correctedData[metricType] = {};
                }
                correctedData[metricType][metricIdentifier] = metrics[metricIdentifier];
            }
        }
        return correctedData;
    }
    processLabeledMetric(snapshot, metricType, metricId, metricData) {
        const newType = `labeled_${metricType}`;
        const idLabelSplit = metricId.split("/", 2);
        const newId = idLabelSplit[0];
        const label = idLabelSplit[1];
        if (newType in snapshot && newId in snapshot[newType]) {
            const existingData = snapshot[newType][newId];
            snapshot[newType][newId] = {
                ...existingData,
                [label]: metricData
            };
        }
        else {
            snapshot[newType] = {
                ...snapshot[newType],
                [newId]: {
                    [label]: metricData
                }
            };
        }
    }
}
export default MetricsDatabase;
