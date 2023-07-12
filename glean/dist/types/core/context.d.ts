import type MetricsDatabase from "./metrics/database/async.js";
import type MetricsDatabaseSync from "./metrics/database/sync.js";
import type EventsDatabase from "./metrics/events_database/async.js";
import type { EventsDatabaseSync } from "./metrics/events_database/sync.js";
import type PingsDatabase from "./pings/database/async.js";
import type PingsDatabaseSync from "./pings/database/sync.js";
import type ErrorManager from "./error/async.js";
import type ErrorManagerSync from "./error/sync.js";
import type Platform from "../platform/async.js";
import type PlatformSync from "../platform/sync.js";
import type { CoreMetrics } from "./internal_metrics/async.js";
import type { CoreMetricsSync } from "./internal_metrics/sync.js";
import type { Configuration } from "./config.js";
import type CorePings from "./internal_pings.js";
import type { Metric } from "./metrics/metric.js";
import type { JSONValue } from "./utils.js";
import Dispatcher from "./dispatcher.js";
/**
 * This class holds all of the Glean singleton's state and internal dependencies.
 *
 * It is necessary so that internal modules don't need to import Glean directly.
 * Doing that should be avoided at all costs because that singleton imports
 * most of our internal modules by value. That causes bad circular dependency issues,
 * due to the module being imported by Glean and also importing Glean.
 *
 * This singleton breaks the cycle, by serving as a bridge between the Glean singleton
 * and the internal modules. All of the imports in this file should be `import type`
 * which only matter for Typescript and don't cause circular dependency issues.
 */
export declare class Context {
    private static _instance?;
    private dispatcher;
    private platform;
    private corePings;
    private coreMetrics;
    private uploadEnabled;
    private metricsDatabase;
    private eventsDatabase;
    private pingsDatabase;
    private errorManager;
    private applicationId;
    private config;
    private initialized;
    private testing;
    private supportedMetrics;
    private startTime;
    private constructor();
    static get instance(): Context;
    /**
     * Test-only API
     *
     * Resets the Context to an uninitialized state.
     */
    static testUninitialize(): void;
    static get dispatcher(): Dispatcher;
    static get uploadEnabled(): boolean;
    static set uploadEnabled(upload: boolean);
    static get metricsDatabase(): MetricsDatabase | MetricsDatabaseSync;
    static set metricsDatabase(db: MetricsDatabase | MetricsDatabaseSync);
    static get eventsDatabase(): EventsDatabase | EventsDatabaseSync;
    static set eventsDatabase(db: EventsDatabase | EventsDatabaseSync);
    static get pingsDatabase(): PingsDatabase | PingsDatabaseSync;
    static set pingsDatabase(db: PingsDatabase | PingsDatabaseSync);
    static get errorManager(): ErrorManager | ErrorManagerSync;
    static set errorManager(db: ErrorManager | ErrorManagerSync);
    static get applicationId(): string;
    static set applicationId(id: string);
    static get initialized(): boolean;
    static set initialized(init: boolean);
    static get config(): Configuration;
    static set config(config: Configuration);
    static get startTime(): Date;
    static get testing(): boolean;
    static set testing(flag: boolean);
    static get corePings(): CorePings;
    static set corePings(pings: CorePings);
    static get coreMetrics(): CoreMetrics | CoreMetricsSync;
    static set coreMetrics(metrics: CoreMetrics | CoreMetricsSync);
    static set platform(platform: Platform | PlatformSync);
    static get platform(): Platform | PlatformSync;
    static isPlatformSet(): boolean;
    static isPlatformSync(): boolean;
    static getSupportedMetric(type: string): (new (v: unknown) => Metric<JSONValue, JSONValue>) | undefined;
    /**
     * Adds a new constructor to the supported metrics map.
     *
     * If the metric map already contains this constructor, this is a no-op.
     *
     * @param type A string identifying the given metric type.
     * @param ctor The metric constructor.
     */
    static addSupportedMetric(type: string, ctor: new (v: unknown) => Metric<JSONValue, JSONValue>): void;
}
