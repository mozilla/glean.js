import { CLIENT_INFO_STORAGE, KNOWN_CLIENT_ID } from "../constants.js";
import { Configuration } from "../config.js";
import MetricsDatabase from "../metrics/database/async.js";
import PingsDatabase from "../pings/database/async.js";
import PingUploadManager from "../upload/manager/async.js";
import { isBoolean, isString, sanitizeApplicationId } from "../utils.js";
import { CoreMetrics } from "../internal_metrics/async.js";
import EventsDatabase from "../metrics/events_database/async.js";
import { DatetimeMetric } from "../metrics/types/datetime.js";
import CorePings from "../internal_pings.js";
import { registerPluginToEvent } from "../events/utils/async.js";
import ErrorManager from "../error/async.js";
import { Context } from "../context.js";
import log, { LoggingLevel } from "../log.js";
const LOG_TAG = "core.Glean";
var Glean;
(function (Glean) {
    async function onUploadEnabled() {
        Context.uploadEnabled = true;
        await Context.coreMetrics.initialize();
    }
    async function onUploadDisabled(at_init) {
        let reason;
        if (at_init) {
            reason = "at_init";
        }
        else {
            reason = "set_upload_enabled";
        }
        Context.uploadEnabled = false;
        await Context.corePings.deletionRequest.submitUndispatched(reason);
        await clearMetrics();
    }
    async function clearMetrics() {
        await Glean.pingUploader.clearPendingPingsQueue();
        let firstRunDate;
        try {
            firstRunDate = new DatetimeMetric(await Context.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, Context.coreMetrics.firstRunDate)).date;
        }
        catch (_a) {
            firstRunDate = new Date();
        }
        await Context.eventsDatabase.clearAll();
        await Context.metricsDatabase.clearAll();
        await Context.pingsDatabase.clearAll();
        Context.uploadEnabled = true;
        await Context.coreMetrics.clientId.setUndispatched(KNOWN_CLIENT_ID);
        await Context.coreMetrics.firstRunDate.setUndispatched(firstRunDate);
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
        Context.coreMetrics = new CoreMetrics();
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
        Context.metricsDatabase = new MetricsDatabase();
        Context.eventsDatabase = new EventsDatabase();
        Context.pingsDatabase = new PingsDatabase();
        Context.errorManager = new ErrorManager();
        Glean.pingUploader = new PingUploadManager(correctConfig, Context.pingsDatabase);
        if (config === null || config === void 0 ? void 0 : config.plugins) {
            for (const plugin of config.plugins) {
                registerPluginToEvent(plugin);
            }
        }
        Context.dispatcher.flushInit(async () => {
            Context.initialized = true;
            Context.uploadEnabled = uploadEnabled;
            await Context.eventsDatabase.initialize();
            if (uploadEnabled) {
                await Context.metricsDatabase.clear("application");
                await onUploadEnabled();
            }
            else {
                const clientId = await Context.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, Context.coreMetrics.clientId);
                if (clientId) {
                    if (clientId !== KNOWN_CLIENT_ID) {
                        await onUploadDisabled(true);
                    }
                }
                else {
                    await clearMetrics();
                }
            }
            await Context.pingsDatabase.scanPendingPings();
        });
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
        Context.dispatcher.launch(async () => {
            if (Context.uploadEnabled !== flag) {
                if (flag) {
                    await onUploadEnabled();
                }
                else {
                    await onUploadDisabled(false);
                }
            }
        });
    }
    Glean.setUploadEnabled = setUploadEnabled;
    function setLogPings(flag) {
        if (!Context.initialized) {
            Glean.preInitLogPings = flag;
        }
        else {
            Context.dispatcher.launch(() => {
                Context.config.logPings = flag;
                return Promise.resolve();
            });
        }
    }
    Glean.setLogPings = setLogPings;
    function setDebugViewTag(value) {
        if (!Context.initialized) {
            Glean.preInitDebugViewTag = value;
        }
        else {
            Context.dispatcher.launch(() => {
                Context.config.debugViewTag = value;
                return Promise.resolve();
            });
        }
    }
    Glean.setDebugViewTag = setDebugViewTag;
    function setSourceTags(value) {
        if (!Context.initialized) {
            Glean.preInitSourceTags = value;
        }
        else {
            Context.dispatcher.launch(() => {
                Context.config.sourceTags = value;
                return Promise.resolve();
            });
        }
    }
    Glean.setSourceTags = setSourceTags;
    async function shutdown() {
        if (!Context.initialized) {
            log(LOG_TAG, "Attempted to shutdown Glean, but Glean is not initialized. Ignoring.");
            return;
        }
        await Context.dispatcher.shutdown();
        await Glean.pingUploader.blockOnOngoingUploads();
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
