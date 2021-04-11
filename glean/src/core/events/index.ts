/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Plugin from "../../plugins/index.js";

import { PingPayload } from "../pings/ping_payload.js";
import { JSONObject } from "../utils.js";

export class CoreEvent<
   // An array of arguments that the event will provide as context to the plugin action.
   Context extends unknown[] = unknown[],
   // The expected type of the action result. To be returned by the plugin.
   Result extends unknown = unknown
> {
  // The plugin to be triggered eveytime this even occurs.
  private plugin?: Plugin<CoreEvent<Context, Result>>;

  constructor(readonly name: string) {}

  get registeredPluginIdentifier(): string | undefined {
    return this.plugin?.name;
  }

  /**
   * Registers a plugin that listens to this event.
   *
   * @param plugin The plugin to register.
   */
  registerPlugin(plugin: Plugin<CoreEvent<Context, Result>>): void {
    if (this.plugin) {
      console.error(
        `Attempted to register plugin '${plugin.name}', which listens to the event '${plugin.event}'.`,
        `That event is already watched by plugin '${this.plugin.name}'`,
        `Plugin '${plugin.name}' will be ignored.`
      );
      return;
    }

    this.plugin = plugin;
  }

  /**
   * Deregisters the currently registered plugin.
   *
   * If no plugin is currently registered this is a no-op.
   */
  deregisterPlugin(): void {
    this.plugin = undefined;
  }

  /**
   * Triggers this event.
   *
   * Will execute the action of the registered plugin, if there is any.
   *
   * @param args The arguments to be passed as context to the registered plugin.
   *
   * @returns The result from the plugin execution.
   */
  trigger(...args: Context): Result | void {
    if (this.plugin) {
      return this.plugin.action(...args);
    }
  }
}

/**
 * Glean internal events.
 */
const CoreEvents: {
  afterPingCollection: CoreEvent<[PingPayload], Promise<JSONObject>>,
  [unused: string]: CoreEvent
} = {
  // Event that is triggered immediatelly after a ping is collect and before it is recorded.
  //
  //  - Context: The `PingPayload` of the recently collected ping.
  //  - Result: The modified payload as a JSON object.
  afterPingCollection: new CoreEvent<[PingPayload], Promise<JSONObject>>("afterPingCollection")
};

export default CoreEvents;
