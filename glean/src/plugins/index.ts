/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CoreEvent } from "../core/events/index.js";

// Helper type that extracts the type of the Context from a generic CoreEvent.
export type EventContext<Context> = Context extends CoreEvent<infer InnerContext, unknown>
 ? InnerContext
 : undefined[];

// Helper type that extracts the type of the Result from a generic CoreEvent.
export type EventResult<Result> = Result extends CoreEvent<unknown[], infer InnerResult>
 ? InnerResult
 : void;

/**
 * Plugins can listen to events that happen during Glean's lifecycle.
 *
 * Every Glean plugin must extend this class.
 */
abstract class Plugin<E extends CoreEvent = CoreEvent> {
  /**
   * Instantiates the Glean plugin.
   *
   * @param event The name of the even this plugin listens to.
   * @param name The name of this plugin.
   */
  constructor(readonly event: string, readonly name: string) {}

 /**
  * An action that will be triggered everytime the listened to event occurs.
  *
  * @param args The arguments that are expected to be passed by this event.
  */
 abstract action(...args: EventContext<E>): EventResult<E>;
}

export default Plugin;
