import { KNOWN_CLIENT_ID, CLIENT_INFO_STORAGE } from "../constants.js";
import { InternalUUIDMetricType as UUIDMetricType } from "../metrics/types/uuid.js";
import { InternalDatetimeMetricType as DatetimeMetricType } from "../metrics/types/datetime.js";
import { InternalStringMetricType as StringMetricType } from "../metrics/types/string.js";
import { createMetric } from "../metrics/utils.js";
import TimeUnit from "../metrics/time_unit.js";
import { generateUUIDv4, isWindowObjectUnavailable } from "../utils.js";
import log, { LoggingLevel } from "../log.js";
import { Context } from "../context.js";
const LOG_TAG = "core.InternalMetrics";
export class CoreMetricsSync {
    constructor() {
        this.clientId = new UUIDMetricType({
            name: "client_id",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "user",
            disabled: false
        });
        this.firstRunDate = new DatetimeMetricType({
            name: "first_run_date",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "user",
            disabled: false
        }, TimeUnit.Day);
        this.os = new StringMetricType({
            name: "os",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.osVersion = new StringMetricType({
            name: "os_version",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.architecture = new StringMetricType({
            name: "architecture",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.locale = new StringMetricType({
            name: "locale",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.appChannel = new StringMetricType({
            name: "app_channel",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.appBuild = new StringMetricType({
            name: "app_build",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.appDisplayVersion = new StringMetricType({
            name: "app_display_version",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        });
        this.buildDate = new DatetimeMetricType({
            name: "build_date",
            category: "",
            sendInPings: ["glean_client_info"],
            lifetime: "application",
            disabled: false
        }, "second");
    }
    initialize() {
        if (isWindowObjectUnavailable()) {
            return;
        }
        const migrationFlag = localStorage.getItem("GLEAN_MIGRATION_FLAG");
        if (migrationFlag !== "1") {
            this.migrateCoreMetricsFromIdb();
            localStorage.setItem("GLEAN_MIGRATION_FLAG", "1");
        }
        else {
            this.initializeUserLifetimeMetrics();
        }
        this.os.set(Context.platform.info.os());
        this.osVersion.set(Context.platform.info.osVersion(Context.config.osVersion));
        this.architecture.set(Context.platform.info.arch(Context.config.architecture));
        this.locale.set(Context.platform.info.locale());
        this.appBuild.set(Context.config.appBuild || "Unknown");
        this.appDisplayVersion.set(Context.config.appDisplayVersion || "Unknown");
        if (Context.config.channel) {
            this.appChannel.set(Context.config.channel);
        }
        if (Context.config.buildDate) {
            this.buildDate.set();
        }
    }
    initializeClientId() {
        let needNewClientId = false;
        const clientIdData = Context.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, this.clientId);
        if (clientIdData) {
            try {
                const currentClientId = createMetric("uuid", clientIdData);
                if (currentClientId.payload() === KNOWN_CLIENT_ID) {
                    needNewClientId = true;
                }
            }
            catch (_a) {
                log(LOG_TAG, "Unexpected value found for Glean clientId. Ignoring.", LoggingLevel.Warn);
                needNewClientId = true;
            }
        }
        else {
            needNewClientId = true;
        }
        if (needNewClientId) {
            this.clientId.set(generateUUIDv4());
        }
    }
    initializeFirstRunDate() {
        const firstRunDate = Context.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, this.firstRunDate);
        if (!firstRunDate) {
            this.firstRunDate.set();
        }
    }
    initializeUserLifetimeMetrics() {
        this.initializeClientId();
        this.initializeFirstRunDate();
    }
    migrateCoreMetricsFromIdb() {
        const dbRequest = window.indexedDB.open("Glean");
        dbRequest.onerror = () => {
            this.initializeUserLifetimeMetrics();
        };
        dbRequest.onsuccess = () => {
            try {
                const db = dbRequest.result;
                const transaction = db === null || db === void 0 ? void 0 : db.transaction("Main", "readwrite");
                const store = transaction.objectStore("Main");
                const req = store.get("userLifetimeMetrics");
                req.onsuccess = () => {
                    var _a, _b, _c, _d, _e, _f;
                    const clientId = (_c = (_b = (_a = req.result) === null || _a === void 0 ? void 0 : _a["glean_client_info"]) === null || _b === void 0 ? void 0 : _b["uuid"]) === null || _c === void 0 ? void 0 : _c["client_id"];
                    if (!!clientId) {
                        this.clientId.set(clientId);
                    }
                    else {
                        this.initializeClientId();
                    }
                    const firstRunDate = (_f = (_e = (_d = req.result) === null || _d === void 0 ? void 0 : _d["glean_client_info"]) === null || _e === void 0 ? void 0 : _e["datetime"]) === null || _f === void 0 ? void 0 : _f["first_run_date"];
                    if (!!firstRunDate) {
                        this.firstRunDate.setSyncRaw(firstRunDate.date, firstRunDate.timezone, firstRunDate.timeUnit);
                    }
                    else {
                        this.initializeFirstRunDate();
                    }
                };
                req.onerror = () => {
                    this.initializeUserLifetimeMetrics();
                };
            }
            catch (e) {
                this.initializeUserLifetimeMetrics();
            }
        };
    }
}
