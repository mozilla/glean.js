import type { CoreEvent } from "../shared.js";
import type Plugin from "../../../plugins/index.js";
/**
 * Registers a plugin to the desired Glean event.
 *
 * If the plugin is attempting to listen to an unknown event it will be ignored.
 *
 * @param plugin The plugin to register.
 */
export declare function registerPluginToEvent<E extends CoreEvent>(plugin: Plugin<E>): void;
/**
 * Test-only API
 *
 * Deregister plugins registered to all Glean events.
 */
export declare function testResetEvents(): void;
