import type { DatetimeMetric } from "../../metrics/types/datetime.js";
import type { InternalDatetimeMetricType as DatetimeMetricType } from "../../metrics/types/datetime.js";
import type CommonPingData from "../common_ping_data.js";
export declare const PINGS_MAKER_LOG_TAG = "core.Pings.Maker";
export interface StartTimeMetricData {
    startTimeMetric: DatetimeMetricType;
    startTime: DatetimeMetric;
}
/**
 * Build a pings submission path.
 *
 * @param identifier The pings UUID identifier.
 * @param ping  The ping to build a path for.
 * @returns The final submission path.
 */
export declare function makePath(identifier: string, ping: CommonPingData): string;
/**
 * Gathers all the headers to be included to the final ping request.
 *
 * This guarantees that if headers are disabled after the ping collection,
 * ping submission will still contain the desired headers.
 *
 * The current headers gathered here are:
 * - [X-Debug-ID]
 * - [X-Source-Tags]
 *
 * @returns An object containing all the headers and their values
 *          or `undefined` in case no custom headers were set.
 */
export declare function getPingHeaders(): Record<string, string> | undefined;
