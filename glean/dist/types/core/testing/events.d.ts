import EventsDatabase from "../metrics/events_database/async.js";
/**
 * Test-only API
 *
 * Fakes a restart by creating a new instance of the events database which will
 * log a `glean.restarted` event.
 *
 * If you do not move the clock forward, an error will be logged.
 *
 * @param timeOffset How far ahead to move clock before restarting. Some events just need
 *        a future time, others need a specific future time. The default time is 1 minute.
 * @returns New instance of `EventsDatabase` since we "restarted" it.
 */
export declare function testRestartGlean(timeOffset?: number): Promise<EventsDatabase>;
