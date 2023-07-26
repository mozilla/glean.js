import { CLIENT_INFO_STORAGE, KNOWN_CLIENT_ID } from "../constants.js";
import { Configuration } from "../config.js";
import PingUploadManager from "../upload/manager/sync.js";
import { isBoolean, isString, sanitizeApplicationId } from "../utils.js";
import { CoreMetricsSync } from "../internal_metrics/sync.js";
import { EventsDatabaseSync } from "../metrics/events_database/sync.js";
import { DatetimeMetric } from "../metrics/types/datetime.js";
import CorePings from "../internal_pings.js";
import { registerPluginToEvent } from "../events/utils/sync.js";
import ErrorManagerSync from "../error/sync.js";
import { Context } from "../context.js";
import log, { LoggingLevel } from "../log.js";
import MetricsDatabaseSync from "../metrics/database/sync.js";
import PingsDatabaseSync from "../pings/database/sync.js";
const LOG_TAG = "core.Glean";
var Glean;
(function (Glean) {
    function onUploadEnabled() {
        Context.uploadEnabled = true;
        Context.coreMetrics.initialize();
    }
    function onUploadDisabled(at_init) {
        let reason;
        if (at_init) {
            reason = "at_init";
        }
        else {
            reason = "set_upload_enabled";
        }
        Context.uploadEnabled = false;
        Context.corePings.deletionRequest.submit(reason);
        clearMetrics();
    }
    function clearMetrics() {
        Glean.pingUploader.clearPendingPingsQueue();
        let firstRunDate;
        try {
            firstRunDate = new DatetimeMetric(Context.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, Context.coreMetrics.firstRunDate)).date;
        }
        catch (_a) {
            firstRunDate = new Date();
        }
        Context.eventsDatabase.clearAll();
        Context.metricsDatabase.clearAll();
        Context.pingsDatabase.clearAll();
        Context.uploadEnabled = true;
        Context.coreMetrics.clientId.set(KNOWN_CLIENT_ID);
        Context.coreMetrics.firstRunDate.set(firstRunDate);
        Context.uploadEnabled = false;
    }
    function initialize(applicationId, uploadEnabled, config) {
        if (Context.initialized) {
            log(LOG_TAG, "Attempted to initialize Glean, but it has already been initialized. Ignoring.", LoggingLevel.Warn);
            return;
        }
        if (!isString(applicationId)) {
            log(LOG_TAG, "Unable to initialize Glean, applicationId must be a string.", LoggingLevel.Error);
            return;
        }
        if (!isBoolean(uploadEnabled)) {
            log(LOG_TAG, "Unable to initialize Glean, uploadEnabled must be a boolean.", LoggingLevel.Error);
            return;
        }
        if (applicationId.length === 0) {
            log(LOG_TAG, "Unable to initialize Glean, applicationId cannot be an empty string.", LoggingLevel.Error);
            return;
        }
        if (!Context.platform) {
            log(LOG_TAG, "Unable to initialize Glean, platform has not been set.", LoggingLevel.Error);
            return;
        }
        Context.coreMetrics = new CoreMetricsSync();
        Context.corePings = new CorePings();
        Context.applicationId = sanitizeApplicationId(applicationId);
        const correctConfig = new Configuration(config);
        Context.config = correctConfig;
        if (Glean.preInitLogPings)
            Context.config.logPings = Glean.preInitLogPings;
        if (Glean.preInitDebugViewTag)
            Context.config.debugViewTag = Glean.preInitDebugViewTag;
        if (Glean.preInitSourceTags)
            Context.config.sourceTags = Glean.preInitSourceTags;
        Context.metricsDatabase = new MetricsDatabaseSync();
        Context.eventsDatabase = new EventsDatabaseSync();
        Context.pingsDatabase = new PingsDatabaseSync();
        Context.errorManager = new ErrorManagerSync();
        Glean.pingUploader = new PingUploadManager(correctConfig, Context.pingsDatabase);
        if (config === null || config === void 0 ? void 0 : config.plugins) {
            for (const plugin of config.plugins) {
                registerPluginToEvent(plugin);
            }
        }
        Context.initialized = true;
        Context.uploadEnabled = uploadEnabled;
        Context.eventsDatabase.initialize();
        if (uploadEnabled) {
            Context.metricsDatabase.clear("application");
            onUploadEnabled();
        }
        else {
            const clientId = Context.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, Context.coreMetrics.clientId);
            if (clientId) {
                if (clientId !== KNOWN_CLIENT_ID) {
                    onUploadDisabled(true);
                }
            }
            else {
                clearMetrics();
            }
        }
        Context.pingsDatabase.scanPendingPings();
    }
    Glean.initialize = initialize;
    function setUploadEnabled(flag) {
        if (!Context.initialized) {
            log(LOG_TAG, [
                "Changing upload enabled before Glean is initialized is not supported.\n",
                "Pass the correct state into `initialize`.\n",
                "See documentation at https://mozilla.github.io/glean/book/user/general-api.html#initializing-the-glean-sdk`"
            ], LoggingLevel.Error);
            return;
        }
        if (!isBoolean(flag)) {
            log(LOG_TAG, "Unable to change upload state, new value must be a boolean. Ignoring.", LoggingLevel.Error);
            return;
        }
        if (Context.uploadEnabled !== flag) {
            if (flag) {
                onUploadEnabled();
            }
            else {
                onUploadDisabled(false);
            }
        }
    }
    Glean.setUploadEnabled = setUploadEnabled;
    function setLogPings(flag) {
        if (!Context.initialized) {
            Glean.preInitLogPings = flag;
        }
        else {
            Context.config.logPings = flag;
        }
    }
    Glean.setLogPings = setLogPings;
    function setDebugViewTag(value) {
        if (!Context.initialized) {
            Glean.preInitDebugViewTag = value;
        }
        else {
            Context.config.debugViewTag = value;
        }
    }
    Glean.setDebugViewTag = setDebugViewTag;
    function setSourceTags(value) {
        if (!Context.initialized) {
            Glean.preInitSourceTags = value;
        }
        else {
            Context.config.sourceTags = value;
        }
    }
    Glean.setSourceTags = setSourceTags;
    function shutdown() {
        log(LOG_TAG, "Calling shutdown for the Glean web implementation is a no-op. Ignoring.");
        return;
    }
    Glean.shutdown = shutdown;
    function setPlatform(platform) {
        if (Context.initialized) {
            return;
        }
        if (Context.isPlatformSet() && Context.platform.name !== platform.name && !Context.testing) {
            log(LOG_TAG, [
                `IMPOSSIBLE: Attempted to change Glean's targeted platform",
            "from "${Context.platform.name}" to "${platform.name}". Ignoring.`
            ], LoggingLevel.Error);
        }
        Context.platform = platform;
    }
    Glean.setPlatform = setPlatform;
})(Glean || (Glean = {}));
export default Glean;
