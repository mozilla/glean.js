/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * An enum representing the possible metric lifetimes.
 */
export const enum Lifetime {
  // The metric is reset with each sent ping
  Ping = "ping",
  // The metric is reset on application restart
  Application = "application",
  // The metric is reset with each user profile
  User = "user",
}
