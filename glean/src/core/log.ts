/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// The available logging levels for a message.
export enum LoggingLevel {
  // Will result in calling the `console.debug` API.
  Debug = "debug",
  // Will result in calling the `console.info` API.
  Info = "info",
  // Will result in calling the `console.warn` API.
  Warn = "warn",
  // Will result in calling the `console.error` API.
  Error = "error"
}

/**
 * Logs a message to the console, tagging it as a message that is coming from Glean.
 *
 * # Important
 *
 * The message is always logged on the `debug` level.
 *
 * @param modulePath The path to the entity which logging this message.
 *        This should be a dotted camel case string, so spaces. Note that whatever path is
 *        given here will be prefixed with `Glean.`.
 * @param message The message to log.
 * @param level The level in which to log this message, default is LoggingLevel.Debug.
 */
export default function log(
  modulePath: string,
  message: unknown | unknown[],
  level = LoggingLevel.Debug
): void {
  const prefix = `(Glean.${modulePath})`;
  if (Array.isArray(message)) {
    console[level](prefix, ...message);
  } else {
    console[level](prefix, message);
  }
}
