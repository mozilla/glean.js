import log, { LoggingLevel } from "../log.js";
const LOG_TAG = "core.Events";
export class CoreEvent {
    constructor(name) {
        this.name = name;
    }
    get registeredPluginIdentifier() {
        var _a;
        return (_a = this.plugin) === null || _a === void 0 ? void 0 : _a.name;
    }
    registerPlugin(plugin) {
        if (this.plugin) {
            log(LOG_TAG, [
                `Attempted to register plugin '${plugin.name}', which listens to the event '${plugin.event}'.`,
                `That event is already watched by plugin '${this.plugin.name}'`,
                `Plugin '${plugin.name}' will be ignored.`
            ], LoggingLevel.Error);
            return;
        }
        this.plugin = plugin;
    }
    deregisterPlugin() {
        this.plugin = undefined;
    }
    trigger(...args) {
        if (this.plugin) {
            return this.plugin.action(...args);
        }
    }
}
