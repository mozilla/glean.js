import type { ConfigurationInterface } from "../config.js";
/**
 * Test-only API
 *
 * Initializes Glean in testing mode.
 *
 * All platform specific APIs will be mocked.
 *
 * @param applicationId The application ID (will be sanitized during initialization).
 * @param uploadEnabled Determines whether telemetry is enabled.
 *        If disabled, all persisted metrics, events and queued pings (except
 *        first_run_date) are cleared. Default to `true`.
 * @param config Glean configuration options.
 */
export declare function testInitializeGlean(applicationId: string, uploadEnabled?: boolean, config?: ConfigurationInterface): Promise<void>;
/**
 * Test-only API
 *
 * Resets Glean to an uninitialized state.
 * This is a no-op in case Glean has not been initialized.
 *
 * @param clearStores Whether or not to clear the events, metrics and pings databases on uninitialize.
 */
export declare function testUninitializeGlean(clearStores?: boolean): Promise<void>;
