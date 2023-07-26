import type { CommonMetricData } from "../index.js";
import type { ExtraMap, Event } from "../events_database/recorded_event.js";
import { MetricType } from "../index.js";
/**
 * Base implementation of the event metric type,
 * meant only for Glean internal use.
 *
 * This class exposes Glean-internal properties and methods
 * of the event metric type.
 */
export declare class InternalEventMetricType<SpecificExtraMap extends ExtraMap = ExtraMap> extends MetricType {
    private allowedExtraKeys?;
    constructor(meta: CommonMetricData, allowedExtraKeys?: string[]);
    /**
     * Record an event.
     *
     * @param extra optional. Used for events where additional richer context is needed.
     *        The maximum length for string values is 100 bytes.
     * @param timestamp The event timestamp, defaults to now.
     */
    record(extra?: SpecificExtraMap, timestamp?: number): void;
    recordAsync(timestamp: number, extra?: SpecificExtraMap): void;
    /**
     * An implementation of `record` that does not dispatch the recording task.
     *
     * # Important
     *
     * This method should **never** be exposed to users.
     *
     * @param extra optional. Used for events where additional richer context is needed.
     *        The maximum length for string values is 100 bytes.
     * @param timestamp The event timestamp, defaults to now.
     * @returns A promise that resolves once the event is recorded.
     */
    recordUndispatched(extra?: ExtraMap, timestamp?: number): Promise<void>;
    recordSync(timestamp: number, extra?: SpecificExtraMap): void;
    /**
     * Test-only API
     *
     * Gets the currently stored events.
     *
     * This doesn't clear the stored value.
     *
     * @param ping the ping from which we want to retrieve this metrics value from.
     *        Defaults to the first value in `sendInPings`.
     * @returns The value found in storage or `undefined` if nothing was found.
     */
    testGetValue(ping?: string): Promise<Event[] | undefined>;
}
/**
 * An event metric.
 */
export default class EventMetricType<SpecificExtraMap extends ExtraMap = ExtraMap> {
    #private;
    constructor(meta: CommonMetricData, allowedExtraKeys?: string[]);
    /**
     * Record an event.
     *
     * @param extra optional. Used for events where additional richer context is needed.
     *        The maximum length for string values is 100 bytes.
     */
    record(extra?: SpecificExtraMap): void;
    /**
     * Test-only API
     *
     * Gets the currently stored events.
     *
     * This doesn't clear the stored value.
     *
     * @param ping the ping from which we want to retrieve this metrics value from.
     *        Defaults to the first value in `sendInPings`.
     * @returns The value found in storage or `undefined` if nothing was found.
     */
    testGetValue(ping?: string): Promise<Event[] | undefined>;
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
