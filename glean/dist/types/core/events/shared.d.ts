import type Plugin from "../../plugins/index.js";
export declare class CoreEvent<Context extends unknown[] = unknown[], Result = unknown> {
    readonly name: string;
    private plugin?;
    constructor(name: string);
    get registeredPluginIdentifier(): string | undefined;
    /**
     * Registers a plugin that listens to this event.
     *
     * @param plugin The plugin to register.
     */
    registerPlugin(plugin: Plugin<CoreEvent<Context, Result>>): void;
    /**
     * Deregisters the currently registered plugin.
     *
     * If no plugin is currently registered this is a no-op.
     */
    deregisterPlugin(): void;
    /**
     * Triggers this event.
     *
     * Will execute the action of the registered plugin, if there is any.
     *
     * @param args The arguments to be passed as context to the registered plugin.
     * @returns The result from the plugin execution.
     */
    trigger(...args: Context): Result | void;
}
