import type { Event } from "./recorded_event.js";
import type { JSONArray } from "../../utils.js";
import type { InternalEventMetricType as EventMetricType } from "../types/event.js";
import { RecordedEvent } from "./recorded_event.js";
export declare class EventsDatabaseSync {
    private eventsStore;
    private initialized;
    constructor();
    initialize(): void;
    record(metric: EventMetricType, value: RecordedEvent): void;
    getEvents(ping: string, metric: EventMetricType): Event[] | undefined;
    getPingEvents(ping: string, clearPingLifetimeData: boolean): JSONArray | undefined;
    clearAll(): void;
    private getAvailableStoreNames;
    /**
     * Helper function to validate and get a specific lifetime data
     * related to a ping from the underlying storage.
     *
     * # Note
     *
     * If the value in storage for any of the metrics in the ping is of an unexpected type,
     * the whole ping payload for that lifetime will be thrown away.
     *
     * @param ping The ping we want to get the data from
     * @returns The ping payload found for the given parameters or an empty object
     *          in case no data was found or the data that was found, was invalid.
     */
    private getAndValidatePingData;
    /**
     * Prepares the events payload.
     *
     * 1. Sorts event by execution counter and timestamp;
     * 2. Applies offset to events timestamps;
     * 3. Removes the first event if it is a `glean.restarted` event;
     * 4. Removes reserved extra keys and stringifies all extras values;
     * 5. Removes all trailing `glean.restarted` events (if they exists);
     *
     * @param pingName The name of the ping for which the payload is being prepared.
     * @param pingData An unsorted list of events.
     * @returns An array of sorted events.
     */
    private prepareEventsPayload;
}
export default EventsDatabaseSync;
