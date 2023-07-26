import type { ConfigurationInterface } from "../config.js";
import PingUploadManager from "../upload/manager/sync.js";
import type PlatformSync from "../../platform/sync.js";
declare namespace Glean {
    let pingUploader: PingUploadManager;
    let preInitDebugViewTag: string | undefined;
    let preInitLogPings: boolean | undefined;
    let preInitSourceTags: string[] | undefined;
    /**
     * Initialize  This method should only be called once, subsequent calls will be no-op.
     *
     * @param applicationId The application ID (will be sanitized during initialization).
     * @param uploadEnabled Determines whether telemetry is enabled.
     *        If disabled, all persisted metrics, events and queued pings
     *        (except first_run_date) are cleared.
     * @param config Glean configuration options.
     * @throws
     * - If config.serverEndpoint is an invalid URL;
     * - If the application if is an empty string.
     */
    function initialize(applicationId: string, uploadEnabled: boolean, config?: ConfigurationInterface): void;
    /**
     * Sets whether upload is enabled or not.
     *
     * When uploading is disabled, metrics aren't recorded at all and no
     * data is uploaded.
     *
     * When disabling, all pending metrics, events and queued pings are cleared.
     *
     * When enabling, the core Glean metrics are recreated.
     *
     * If the value of this flag is not actually changed, this is a no-op.
     *
     * @param flag When true, enable metric collection.
     */
    function setUploadEnabled(flag: boolean): void;
    /**
     * Sets the `logPings` debug option.
     *
     * When this flag is `true` pings will be logged to the console right before they are collected.
     *
     * @param flag Whether or not to log pings.
     */
    function setLogPings(flag: boolean): void;
    /**
     * Sets the `debugViewTag` debug option.
     *
     * When this property is set, all subsequent outgoing pings will include the `X-Debug-ID` header
     * which will redirect them to the ["Ping Debug Viewer"](https://debug-ping-preview.firebaseapp.com/).
     *
     * @param value The value of the header.
     *        This value must satisfy the regex `^[a-zA-Z0-9-]{1,20}$` otherwise it will be ignored.
     */
    function setDebugViewTag(value: string): void;
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
    function setSourceTags(value: string[]): void;
    /**
     * Calling shutdown on the synchronous implementation is a no-op. Glean's
     * synchronous implementation does not use the dispatcher, so there is no
     * action to perform.
     */
    function shutdown(): void;
    /**
     * Sets the current environment.
     *
     * This function **must** be called before initialize.
     *
     * @param platform The environment to set.
     *        Please check out the available environments in the platform/ module.
     */
    function setPlatform(platform: PlatformSync): void;
}
export default Glean;
