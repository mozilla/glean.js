/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import CoreEvents, { CoreEvent } from "./index";
import Plugin from "../../plugins";

/**
 * Registers a plugin to the desired Glean event.
 *
 * If the plugin is attempting to listen to an unknown event it will be ignored.
 *
 * @param plugin The plugin to register.
 */
export function registerPluginToEvent<E extends CoreEvent>(plugin: Plugin<E>): void {
  const eventName = plugin.event;
  if (eventName in CoreEvents) {
    const event = CoreEvents[eventName];
    event.registerPlugin(plugin);
    return;
  }

  console.error(
    `Attempted to register plugin '${plugin.name}', which listens to the event '${plugin.event}'.`,
    "That is not a valid Glean event. Ignoring"
  );
}

/**
 * **Test-only API**
 *
 * Deregister plugins registered to all Glean events.
 */
export function testResetEvents(): void {
  for (const event in CoreEvents) {
    CoreEvents[event].deregisterPlugin();
  }
}




