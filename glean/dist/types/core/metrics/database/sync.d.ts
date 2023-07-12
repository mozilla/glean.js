import type { MetricType, Metrics } from "../index.js";
import type { Metric } from "../metric.js";
import type { JSONValue } from "../../utils.js";
import { Lifetime } from "../lifetime.js";
declare class MetricsDatabaseSync {
    private userStore;
    private pingStore;
    private appStore;
    constructor();
    record(metric: MetricType, value: Metric<JSONValue, JSONValue>): void;
    transform(metric: MetricType, transformFn: (v?: JSONValue) => Metric<JSONValue, JSONValue>): void;
    hasMetric(lifetime: Lifetime, ping: string, metricType: string, metricIdentifier: string): boolean;
    countByBaseIdentifier(lifetime: Lifetime, ping: string, metricType: string, metricIdentifier: string): number;
    getMetric<T extends JSONValue>(ping: string, metric: MetricType): T | undefined;
    getPingMetrics(ping: string, clearPingLifetimeData: boolean): Metrics | undefined;
    clear(lifetime: Lifetime, ping?: string): void;
    clearAll(): void;
    /**
     * Returns the store instance for a given lifetime.
     *
     * @param lifetime The lifetime related to the store we want to retrieve.
     * @returns The store related to the given lifetime.
     * @throws If the provided lifetime does not have a related store.
     */
    private chooseStore;
    /**
     * Helper function to validate and get a specific lifetime data
     * related to a ping from the underlying storage.
     *
     * # Note
     *
     * If invalid data is encountered it will be deleted and won't be part of the final ping payload.
     *
     * @param ping The ping we want to get the data from
     * @param lifetime The lifetime of the data we want to retrieve
     * @returns The ping payload found for the given parameters or an empty object
     *          in case no data was found or the data that was found, was invalid.
     */
    private getCorrectedPingData;
    private processLabeledMetric;
}
export default MetricsDatabaseSync;
