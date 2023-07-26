import Dispatcher from "./dispatcher.js";
import log, { LoggingLevel } from "./log.js";
const LOG_TAG = "core.Context";
export class Context {
    constructor() {
        this.initialized = false;
        this.testing = false;
        this.supportedMetrics = {};
        this.startTime = new Date();
        this.dispatcher = new Dispatcher();
    }
    static get instance() {
        if (!Context._instance) {
            Context._instance = new Context();
        }
        return Context._instance;
    }
    static testUninitialize() {
        Context._instance = undefined;
    }
    static get dispatcher() {
        return Context.instance.dispatcher;
    }
    static get uploadEnabled() {
        if (typeof Context.instance.uploadEnabled === "undefined") {
            log(LOG_TAG, [
                "Attempted to access Context.uploadEnabled before it was set. This may cause unexpected behaviour."
            ], LoggingLevel.Trace);
        }
        return Context.instance.uploadEnabled;
    }
    static set uploadEnabled(upload) {
        Context.instance.uploadEnabled = upload;
    }
    static get metricsDatabase() {
        if (typeof Context.instance.metricsDatabase === "undefined") {
            log(LOG_TAG, [
                "Attempted to access Context.metricsDatabase before it was set. This may cause unexpected behaviour."
            ], LoggingLevel.Trace);
        }
        return Context.instance.metricsDatabase;
    }
    static set metricsDatabase(db) {
        Context.instance.metricsDatabase = db;
    }
    static get eventsDatabase() {
        if (typeof Context.instance.eventsDatabase === "undefined") {
            log(LOG_TAG, [
                "Attempted to access Context.eventsDatabase before it was set. This may cause unexpected behaviour."
            ], LoggingLevel.Trace);
        }
        return Context.instance.eventsDatabase;
    }
    static set eventsDatabase(db) {
        Context.instance.eventsDatabase = db;
    }
    static get pingsDatabase() {
        if (typeof Context.instance.pingsDatabase === "undefined") {
            log(LOG_TAG, [
                "Attempted to access Context.pingsDatabase before it was set. This may cause unexpected behaviour."
            ], LoggingLevel.Trace);
        }
        return Context.instance.pingsDatabase;
    }
    static set pingsDatabase(db) {
        Context.instance.pingsDatabase = db;
    }
    static get errorManager() {
        if (typeof Context.instance.errorManager === "undefined") {
            log(LOG_TAG, [
                "Attempted to access Context.errorManager before it was set. This may cause unexpected behaviour."
            ], LoggingLevel.Trace);
        }
        return Context.instance.errorManager;
    }
    static set errorManager(db) {
        Context.instance.errorManager = db;
    }
    static get applicationId() {
        if (typeof Context.instance.applicationId === "undefined") {
            log(LOG_TAG, [
                "Attempted to access Context.applicationId before it was set. This may cause unexpected behaviour."
            ], LoggingLevel.Trace);
        }
        return Context.instance.applicationId;
    }
    static set applicationId(id) {
        Context.instance.applicationId = id;
    }
    static get initialized() {
        return Context.instance.initialized;
    }
    static set initialized(init) {
        Context.instance.initialized = init;
    }
    static get config() {
        if (typeof Context.instance.config === "undefined") {
            log(LOG_TAG, [
                "Attempted to access Context.config before it was set. This may cause unexpected behaviour."
            ], LoggingLevel.Trace);
        }
        return Context.instance.config;
    }
    static set config(config) {
        Context.instance.config = config;
    }
    static get startTime() {
        return Context.instance.startTime;
    }
    static get testing() {
        return Context.instance.testing;
    }
    static set testing(flag) {
        Context.instance.testing = flag;
    }
    static get corePings() {
        return Context.instance.corePings;
    }
    static set corePings(pings) {
        Context.instance.corePings = pings;
    }
    static get coreMetrics() {
        return Context.instance.coreMetrics;
    }
    static set coreMetrics(metrics) {
        Context.instance.coreMetrics = metrics;
    }
    static set platform(platform) {
        Context.instance.platform = platform;
    }
    static get platform() {
        if (typeof Context.instance.platform === "undefined") {
            log(LOG_TAG, [
                "Attempted to access Context.platform before it was set. This may cause unexpected behaviour."
            ], LoggingLevel.Trace);
        }
        return Context.instance.platform;
    }
    static isPlatformSet() {
        return !!Context.instance.platform;
    }
    static isPlatformSync() {
        var _a;
        return ((_a = Context.instance.platform) === null || _a === void 0 ? void 0 : _a.name) === "web";
    }
    static getSupportedMetric(type) {
        return Context.instance.supportedMetrics[type];
    }
    static addSupportedMetric(type, ctor) {
        if (type in Context.instance.supportedMetrics) {
            return;
        }
        Context.instance.supportedMetrics[type] = ctor;
    }
}
