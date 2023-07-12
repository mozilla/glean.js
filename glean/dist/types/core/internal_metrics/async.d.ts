import { InternalUUIDMetricType as UUIDMetricType } from "../metrics/types/uuid.js";
import { InternalDatetimeMetricType as DatetimeMetricType } from "../metrics/types/datetime.js";
import { InternalStringMetricType as StringMetricType } from "../metrics/types/string.js";
/**
 * Glean internal metrics.
 *
 * Metrics initialized here should be defined in `./metrics.yaml`
 * and manually translated into JS code.
 */
export declare class CoreMetrics {
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
    initialize(): Promise<void>;
    /**
     * Generates and sets the client_id if it is not set,
     * or if the current value is corrupted.
     */
    private initializeClientId;
    /**
     * Generates and sets the first_run_date if it is not set.
     */
    private initializeFirstRunDate;
}
