/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export type GleanEvent<
  // An array of arguments that the event will provide to the plugin action.
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Context extends unknown[] = unknown[],
  // The exptected type of the action result. To be returned by the plugin.
  //
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Result extends unknown = unknown
> = {
  // The name of the event.
  name: string;
};

// Helper type that extracts the type of the Context from a generic GleanEvent.
export type EventContext<Context> = Context extends GleanEvent<infer InnerContext, unknown>
 ? InnerContext
 : undefined[];

// Helper type that extracts the type of the Result from a generic GleanEvent.
export type EventResult<Result> = Result extends GleanEvent<unknown[], infer InnerResult>
 ? InnerResult
 : undefined[];

/**
 * Plugins can listen to events that happen during Glean's lifecycle.
 *
 * Every Glean plugin must extend this class.
 */
abstract class GleanPlugin<GleanEvent> {
  /**
   * Instantiates the Glean plugin.
   *
   * @param event The name of the even this plugin instruments.
   * @param name The name of this plugin.
   */
  constructor(readonly event: string, readonly name: string) {}

 /**
  * An action that will be triggered everytime the instrumented event occurs.
  *
  * @param args The arguments that are expected to be passed by this event.
  */
 abstract action(...args: EventContext<GleanEvent>): EventResult<GleanEvent>;
}

export default GleanPlugin;
