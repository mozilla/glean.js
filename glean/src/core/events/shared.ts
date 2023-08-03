/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Plugin from "../../plugins/index.js";
import log, { LoggingLevel } from "../log.js";

const LOG_TAG = "core.Events";

export class CoreEvent<
  // An array of arguments that the event will provide as context to the plugin action.
  Context extends unknown[] = unknown[],
  // The expected type of the action result. To be returned by the plugin.
  Result = unknown
> {
  // The plugin to be triggered every time this event occurs.
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
      log(
        LOG_TAG,
        [
          `Attempted to register plugin '${plugin.name}', which listens to the event '${plugin.event}'.`,
          `That event is already watched by plugin '${this.plugin.name}'`,
          `Plugin '${plugin.name}' will be ignored.`
        ],
        LoggingLevel.Error
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
   * @returns The result from the plugin execution.
   */
  trigger(...args: Context): Result | void {
    if (this.plugin) {
      return this.plugin.action(...args);
    }
  }
}
