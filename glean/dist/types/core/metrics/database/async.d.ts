import type { MetricType, Metrics } from "../index.js";
import type { Metric } from "../metric.js";
import type { JSONValue } from "../../utils.js";
import { Lifetime } from "../lifetime.js";
declare class MetricsDatabase {
    private userStore;
    private pingStore;
    private appStore;
    constructor();
    record(metric: MetricType, value: Metric<JSONValue, JSONValue>): Promise<void>;
    transform(metric: MetricType, transformFn: (v?: JSONValue) => Metric<JSONValue, JSONValue>): Promise<void>;
    hasMetric(lifetime: Lifetime, ping: string, metricType: string, metricIdentifier: string): Promise<boolean>;
    countByBaseIdentifier(lifetime: Lifetime, ping: string, metricType: string, metricIdentifier: string): Promise<number>;
    getMetric<T extends JSONValue>(ping: string, metric: MetricType): Promise<T | undefined>;
    getPingMetrics(ping: string, clearPingLifetimeData: boolean): Promise<Metrics | undefined>;
    clear(lifetime: Lifetime, ping?: string): Promise<void>;
    clearAll(): Promise<void>;
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
export default MetricsDatabase;
