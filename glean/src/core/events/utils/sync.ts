/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CoreEvent } from "../shared.js";
import type Plugin from "../../../plugins/index.js";

import CoreEventsSync from "../sync.js";
import log, { LoggingLevel } from "../../log.js";

const LOG_TAG = "core.Events.Utils";

/**
 * Registers a plugin to the desired Glean event.
 *
 * If the plugin is attempting to listen to an unknown event it will be ignored.
 *
 * @param plugin The plugin to register.
 */
export function registerPluginToEvent<E extends CoreEvent>(plugin: Plugin<E>): void {
  const eventName = plugin.event;
  if (eventName in CoreEventsSync) {
    const event = CoreEventsSync[eventName];
    event.registerPlugin(plugin);
    return;
  }

  log(
    LOG_TAG,
    [
      `Attempted to register plugin '${plugin.name}', which listens to the event '${plugin.event}'.`,
      "That is not a valid Glean event. Ignoring"
    ],
    LoggingLevel.Error
  );
}

/**
 * Test-only API
 *
 * Deregister plugins registered to all Glean events.
 */
export function testResetEvents(): void {
  for (const event in CoreEventsSync) {
    CoreEventsSync[event].deregisterPlugin();
  }
}
