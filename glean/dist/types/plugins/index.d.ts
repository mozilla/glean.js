import type { CoreEvent } from "../core/events/shared.js";
export declare type EventContext<Context> = Context extends CoreEvent<infer InnerContext, unknown> ? InnerContext : undefined[];
export declare type EventResult<Result> = Result extends CoreEvent<unknown[], infer InnerResult> ? InnerResult : void;
/**
 * Plugins can listen to events that happen during Glean's lifecycle.
 *
 * Every Glean plugin must extend this class.
 */
declare abstract class Plugin<E extends CoreEvent = CoreEvent> {
    readonly event: string;
    readonly name: string;
    /**
     * Instantiates the Glean plugin.
     *
     * @param event The name of the even this plugin listens to.
     * @param name The name of this plugin.
     */
    constructor(event: string, name: string);
    /**
     * An action that will be triggered everytime the listened to event occurs.
     *
     * @param args The arguments that are expected to be passed by this event.
     */
    abstract action(...args: EventContext<E>): EventResult<E>;
}
export default Plugin;
