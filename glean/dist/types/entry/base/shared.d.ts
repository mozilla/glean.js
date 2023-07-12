import type { ConfigurationInterface } from "../../core/config.js";
export declare type RestrictedConfigurationInterface = Omit<ConfigurationInterface, "architecture" | "osVersion">;
export interface IGlean {
    /**
     * Initialize Glean. This method should only be called once, subsequent calls will be no-op.
     *
     * @param applicationId The application ID (will be sanitized, if necessary).
     * @param uploadEnabled Determines whether telemetry is enabled.
     *                      If disabled, all persisted metrics, events and queued pings (except
     *                      first_run_date) are cleared.
     * @param config Glean configuration options.
     */
    initialize(applicationId: string, uploadEnabled: boolean, config?: ConfigurationInterface): void;
    /**
     * Sets whether upload is enabled or not.
     *
     * When uploading is disabled, metrics aren't recorded at all and no data is uploaded.
     *
     * When disabling, all pending metrics, events and queued pings are cleared.
     *
     * When enabling, the core Glean metrics are recreated.
     *
     * If the value of this flag is not actually changed, this is a no-op.
     *
     * If Glean has not been initialized yet, this is also a no-op.
     *
     * @param flag When true, enable metric collection.
     */
    setUploadEnabled(flag: boolean): void;
    /**
     * Sets the `logPings` debug option.
     *
     * When this flag is `true` pings will be logged
     * to the console right before they are collected.
     *
     * @param flag Whether or not to log pings.
     */
    setLogPings(flag: boolean): void;
    /**
     * Sets the `debugViewTag` debug option.
     *
     * When this property is set, all subsequent outgoing pings will include the `X-Debug-ID` header
     * which will redirect them to the ["Ping Debug Viewer"](https://debug-ping-preview.firebaseapp.com/).
     *
     * @param value The value of the header.
     *        This value must satisfy the regex `^[a-zA-Z0-9-]{1,20}$` otherwise it will be ignored.
     */
    setDebugViewTag(value: string): void;
    /**
     * Finishes executing any ongoing tasks and shuts down Glean.
     *
     * This will attempt to send pending pings before resolving.
     *
     * @returns A promise which resolves once shutdown is complete.
     */
    shutdown(): Promise<void> | void;
    /**
     * Sets the `sourceTags` debug option.
     *
     * Ping tags will show in the destination datasets, after ingestion.
     *
     * Note: Setting `sourceTags` will override all previously set tags.
     *
     * @param value A vector of at most 5 valid HTTP header values.
     *        Individual tags must match the regex: "[a-zA-Z0-9-]{1,20}".
     */
    setSourceTags(value: string[]): void;
}
