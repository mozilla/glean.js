import { DEFAULT_TELEMETRY_ENDPOINT, GLEAN_MAX_SOURCE_TAGS } from "./constants.js";
import { validateHeader, validateURL } from "./utils.js";
import log, { LoggingLevel } from "./log.js";
import { Context } from "./context.js";
const LOG_TAG = "core.Config";
const DEFAULT_MAX_EVENTS = 500;
export class Configuration {
    constructor(config) {
        var _a;
        this.channel = config === null || config === void 0 ? void 0 : config.channel;
        this.appBuild = config === null || config === void 0 ? void 0 : config.appBuild;
        this.appDisplayVersion = config === null || config === void 0 ? void 0 : config.appDisplayVersion;
        this.architecture = config === null || config === void 0 ? void 0 : config.architecture;
        this.osVersion = config === null || config === void 0 ? void 0 : config.osVersion;
        this.buildDate = config === null || config === void 0 ? void 0 : config.buildDate;
        this.maxEvents = (config === null || config === void 0 ? void 0 : config.maxEvents) || DEFAULT_MAX_EVENTS;
        this.debug = {};
        if ((config === null || config === void 0 ? void 0 : config.serverEndpoint) && !validateURL(config.serverEndpoint)) {
            throw new Error(`Unable to initialize Glean, serverEndpoint ${config.serverEndpoint} is an invalid URL.`);
        }
        if (!Context.testing && ((_a = config === null || config === void 0 ? void 0 : config.serverEndpoint) === null || _a === void 0 ? void 0 : _a.startsWith("http:"))) {
            throw new Error(`Unable to initialize Glean, serverEndpoint ${config.serverEndpoint} must use the HTTPS protocol.`);
        }
        this.serverEndpoint = (config && config.serverEndpoint)
            ? config.serverEndpoint : DEFAULT_TELEMETRY_ENDPOINT;
        this.httpClient = config === null || config === void 0 ? void 0 : config.httpClient;
    }
    get logPings() {
        return this.debug.logPings || false;
    }
    set logPings(flag) {
        this.debug.logPings = flag;
    }
    get debugViewTag() {
        return this.debug.debugViewTag;
    }
    set debugViewTag(tag) {
        if (!validateHeader(tag || "")) {
            log(LOG_TAG, [
                `"${tag || ""}" is not a valid \`debugViewTag\` value.`,
                "Please make sure the value passed satisfies the regex `^[a-zA-Z0-9-]{1,20}$`."
            ], LoggingLevel.Error);
            return;
        }
        this.debug.debugViewTag = tag;
    }
    get sourceTags() {
        return this.debug.sourceTags;
    }
    set sourceTags(tags) {
        if (!tags || tags.length < 1 || tags.length > GLEAN_MAX_SOURCE_TAGS) {
            log(LOG_TAG, `A list of tags cannot contain more than ${GLEAN_MAX_SOURCE_TAGS} elements or less than one.`, LoggingLevel.Error);
            return;
        }
        for (const tag of tags) {
            if (tag.startsWith("glean")) {
                log(LOG_TAG, "Tags starting with `glean` are reserved and must not be used.", LoggingLevel.Error);
                return;
            }
            if (!validateHeader(tag)) {
                return;
            }
        }
        this.debug.sourceTags = tags;
    }
}
