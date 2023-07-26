import { KNOWN_CLIENT_ID, CLIENT_INFO_STORAGE } from "../constants.js";
import { InternalUUIDMetricType as UUIDMetricType } from "../metrics/types/uuid.js";
import { InternalDatetimeMetricType as DatetimeMetricType } from "../metrics/types/datetime.js";
import { InternalStringMetricType as StringMetricType } from "../metrics/types/string.js";
import { createMetric } from "../metrics/utils.js";
import TimeUnit from "../metrics/time_unit.js";
import { generateUUIDv4 } from "../utils.js";
import log, { LoggingLevel } from "../log.js";
import { Context } from "../context.js";
const LOG_TAG = "core.InternalMetrics";
export class CoreMetrics {
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
    async initialize() {
        await this.initializeClientId();
        await this.initializeFirstRunDate();
        await this.os.setUndispatched(await Context.platform.info.os());
        await this.osVersion.setUndispatched(await Context.platform.info.osVersion(Context.config.osVersion));
        await this.architecture.setUndispatched(await Context.platform.info.arch(Context.config.architecture));
        await this.locale.setUndispatched(await Context.platform.info.locale());
        await this.appBuild.setUndispatched(Context.config.appBuild || "Unknown");
        await this.appDisplayVersion.setUndispatched(Context.config.appDisplayVersion || "Unknown");
        if (Context.config.channel) {
            await this.appChannel.setUndispatched(Context.config.channel);
        }
        if (Context.config.buildDate) {
            await this.buildDate.setUndispatched();
        }
    }
    async initializeClientId() {
        let needNewClientId = false;
        const clientIdData = await Context.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, this.clientId);
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
            await this.clientId.setUndispatched(generateUUIDv4());
        }
    }
    async initializeFirstRunDate() {
        const firstRunDate = await Context.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, this.firstRunDate);
        if (!firstRunDate) {
            await this.firstRunDate.setUndispatched();
        }
    }
}
