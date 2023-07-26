import type { CommonMetricData } from "../index.js";
import type { MetricValidationResult } from "../metric.js";
import { MetricType } from "../index.js";
import TimeUnit from "../../metrics/time_unit.js";
import { Metric } from "../metric.js";
/**
 * Builds the formatted timezone offset string from a given timezone.
 *
 * The format of the resulting string is `+02:00`.
 *
 * @param timezone A number representing the timezone offset to format,
 *                 this is expected to be in minutes.
 * @returns The formatted timezone offset string.
 */
export declare function formatTimezoneOffset(timezone: number): string;
export declare type DatetimeInternalRepresentation = {
    timeUnit: TimeUnit;
    timezone: number;
    date: string;
};
export declare class DatetimeMetric extends Metric<DatetimeInternalRepresentation, string> {
    constructor(v: unknown);
    static fromDate(v: unknown, timeUnit: TimeUnit): DatetimeMetric;
    static fromRawDatetime(isoString: string, timezoneOffset: number, timeUnit: TimeUnit): DatetimeMetric;
    /**
     * Gets the datetime data as a Date object.
     *
     * # Note
     *
     * The object created here will be relative to local time.
     * If the timezone at the time of recording is different,
     * the timezone offset will be applied before transforming to an object.
     *
     * @returns A date object.
     */
    get date(): Date;
    private get timezone();
    private get timeUnit();
    private get dateISOString();
    validate(v: unknown): MetricValidationResult;
    /**
     * Gets this metrics value in its payload representation.
     *
     * For this metric, the payload is the timezone aware ISO date string truncated to the time unit
     * given at the time of recording.
     *
     * # Note
     *
     * The timezone of the final string is the timezone at the time of recording.
     *
     * @returns The metric value.
     */
    payload(): string;
}
/**
 * Base implementation of the datetime metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the datetime metric type.
 */
export declare class InternalDatetimeMetricType extends MetricType {
    timeUnit: TimeUnit;
    constructor(meta: CommonMetricData, timeUnit: string);
    set(value?: Date): void;
    private truncateDate;
    setAsync(value?: Date): void;
    /**
     * An implementation of `set` that does not dispatch the recording task.
     *
     * # Important
     *
     * This method should **never** be exposed to users.
     *
     * @param value The date we want to set to.
     */
    setUndispatched(value?: Date): Promise<void>;
    setSync(value?: Date): void;
    /**
     * Set a datetime metric from raw values.
     *
     * # Important
     * This method should **never** be exposed to users. This is used solely
     * for migrating IDB data to LocalStorage.
     *
     * @param isoString Raw isoString.
     * @param timezone Raw timezone.
     * @param timeUnit Raw timeUnit.
     */
    setSyncRaw(isoString: string, timezone: number, timeUnit: TimeUnit): void;
    /**
     * Test-only API
     *
     * Gets the currently stored value as a DatetimeMetric.
     *
     * This doesn't clear the stored value.
     *
     * @param ping The ping from which we want to retrieve this metrics value from.
     * @param fn The name of the function that is calling this function. Used for testing purposes.
     * @returns The value found in storage or `undefined` if nothing was found.
     */
    private testGetValueAsDatetimeMetric;
    testGetValueAsString(ping?: string): Promise<string | undefined>;
    testGetValue(ping?: string): Promise<Date | undefined>;
}
/**
 * A datetime metric.
 *
 * Used to record an absolute date and time,
 * such as the time the user first ran the application.
 */
export default class {
    #private;
    constructor(meta: CommonMetricData, timeUnit: string);
    /**
     * Set a datetime value, truncating it to the metric's resolution.
     *
     * @param value The Date value to set. If not provided, will record the current time.
     */
    set(value?: Date): void;
    /**
     * Test-only API
     *
     * Gets the currently stored value as an ISO date string.
     *
     * This doesn't clear the stored value.
     *
     * @param ping the ping from which we want to retrieve this metrics value from.
     *        Defaults to the first value in `sendInPings`.
     * @returns The value found in storage or `undefined` if nothing was found.
     */
    testGetValueAsString(ping?: string): Promise<string | undefined>;
    /**
     * Test-only API
     *
     * Gets the currently stored value as a boolean.
     *
     * This doesn't clear the stored value.
     *
     * # Note
     *
     * The Date object is always in **local** time.
     *
     * If the currently stored datetime is in a different timezone than local,
     * the resulting Date object will contain the relative local date to the recorded value.
     *
     * @param ping the ping from which we want to retrieve this metrics value from.
     *        Defaults to the first value in `sendInPings`.
     * @returns The value found in storage or `undefined` if nothing was found.
     */
    testGetValue(ping?: string): Promise<Date | undefined>;
    /**
     * Test-only API
     *
     * Returns the number of errors recorded for the given metric.
     *
     * @param errorType The type of the error recorded.
     * @param ping represents the name of the ping to retrieve the metric for.
     *        Defaults to the first value in `sendInPings`.
     * @returns the number of errors recorded for the metric.
     */
    testGetNumRecordedErrors(errorType: string, ping?: string): Promise<number>;
}
