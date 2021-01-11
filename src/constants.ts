/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");

export const GLEAN_SCHEMA_VERSION = 1;

// The version for the current build of Glean.js
export const GLEAN_VERSION = version;

// The name of a "ping" that will include Glean ping_info metrics,
// such as ping sequence numbers.
//
// Note that this is not really a ping,
// but a neat way to gather metrics in the metrics database.
export const PING_INFO_STORAGE = "glean_ping_info";

// The name of a "ping" that will include the Glean client_info metrics,
// such as ping sequence numbers.
//
// Note that this is not really a ping,
// but a neat way to gather metrics in the metrics database.
export const CLIENT_INFO_STORAGE = "glean_client_info";
