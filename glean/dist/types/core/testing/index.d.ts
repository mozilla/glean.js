import type { ConfigurationInterface } from "../config";
/**
 * Test-only API
 *
 * Resets the Glean singleton to its initial state and re-initializes it.
 *
 * Note: There is no way to only allow this function to be called in test mode,
 * because this is the function that puts Glean in test mode by setting Context.testing to true.
 *
 * @param applicationId The application ID (will be sanitized during initialization).
 * @param uploadEnabled Determines whether telemetry is enabled.
 *        If disabled, all persisted metrics, events and queued pings (except
 *        first_run_date) are cleared. Default to `true`.
 * @param config Glean configuration options.
 * @param clearStores Whether or not to clear the events, metrics and pings databases on reset.
 */
export declare function testResetGlean(applicationId: string, uploadEnabled?: boolean, config?: ConfigurationInterface, clearStores?: boolean): Promise<void>;
export * from "./utils.js";
export * from "./events.js";
