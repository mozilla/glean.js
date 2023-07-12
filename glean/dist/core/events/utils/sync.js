import CoreEventsSync from "../sync.js";
import log, { LoggingLevel } from "../../log.js";
const LOG_TAG = "core.Events.Utils";
export function registerPluginToEvent(plugin) {
    const eventName = plugin.event;
    if (eventName in CoreEventsSync) {
        const event = CoreEventsSync[eventName];
        event.registerPlugin(plugin);
        return;
    }
    log(LOG_TAG, [
        `Attempted to register plugin '${plugin.name}', which listens to the event '${plugin.event}'.`,
        "That is not a valid Glean event. Ignoring"
    ], LoggingLevel.Error);
}
export function testResetEvents() {
    for (const event in CoreEventsSync) {
        CoreEventsSync[event].deregisterPlugin();
    }
}
