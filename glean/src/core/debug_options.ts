/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Lists Glean's debug options.
 */
export interface DebugOptions {
  // Whether or not lot log pings when they are collected.
  logPings?: boolean;
  // The value of the X-Debug-ID header to be included in every ping.
  debugViewTag?: string;
  // The value of the X-Source-Tags header to be included in every ping.
  sourceTags?: string[];
}
