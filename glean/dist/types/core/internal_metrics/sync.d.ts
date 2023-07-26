import { InternalUUIDMetricType as UUIDMetricType } from "../metrics/types/uuid.js";
import { InternalDatetimeMetricType as DatetimeMetricType } from "../metrics/types/datetime.js";
import { InternalStringMetricType as StringMetricType } from "../metrics/types/string.js";
/**
 * Glean internal metrics.
 *
 * Metrics initialized here should be defined in `./metrics.yaml`
 * and manually translated into JS code.
 */
export declare class CoreMetricsSync {
    readonly clientId: UUIDMetricType;
    readonly firstRunDate: DatetimeMetricType;
    readonly os: StringMetricType;
    readonly osVersion: StringMetricType;
    readonly architecture: StringMetricType;
    readonly locale: StringMetricType;
    readonly appChannel: StringMetricType;
    readonly appBuild: StringMetricType;
    readonly appDisplayVersion: StringMetricType;
    readonly buildDate: DatetimeMetricType;
    constructor();
    initialize(): void;
    /**
     * Generates and sets the client_id if it is not set,
     * or if the current value is corrupted.
     */
    private initializeClientId;
    /**
     * Generates and sets the first_run_date if it is not set.
     */
    private initializeFirstRunDate;
    /**
     * Initializes the Glean internal user-lifetime metrics.
     */
    private initializeUserLifetimeMetrics;
    /**
     * Migrates the core metrics from the old IDB storage to LocalStorage
     * on first launch IF the client had used previous versions of Glean.js -
     * pre LocalStorage.
     *
     * There is no way to access IDB data synchronously, so we rely on listeners
     * for when specific actions complete. This means that we need to be careful
     * and ensure that the clientId and firstRunDate are always set.
     *
     * Once the migration is complete, running the initialize functions for the
     * clientId and firstRunDate equate to no-ops. If there is an error anywhere
     * along the way and the migration is not complete, then the initialize the
     * two metrics as usual.
     */
    private migrateCoreMetricsFromIdb;
}
