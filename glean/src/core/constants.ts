/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const GLEAN_SCHEMA_VERSION = 1;

// The version for the current build of Glean.js
//
// PACKAGE_VERSION is defined as a global by webpack,
// we need a default here for testing when the app is not build with webpack.
export const GLEAN_VERSION = "0.17.0";

// The name of a "ping" that will include Glean ping_info metrics,
// such as ping sequence numbers.
//
// Note that this is not really a ping,
// but a neat way to gather metrics in the metrics database.
//
// See: https://mozilla.github.io/glean/book/dev/core/internal/reserved-ping-names.html
export const PING_INFO_STORAGE = "glean_ping_info";

// The name of a "ping" that will include the Glean client_info metrics,
// such as ping sequence numbers.
//
// Note that this is not really a ping,
// but a neat way to gather metrics in the metrics database.
//
// See: https://mozilla.github.io/glean/book/dev/core/internal/reserved-ping-names.html
export const CLIENT_INFO_STORAGE = "glean_client_info";

// We will set the client id to this client id in case upload is disabled.
export const KNOWN_CLIENT_ID = "c0ffeec0-ffee-c0ff-eec0-ffeec0ffeec0";

// The default server pings are sent to.
export const DEFAULT_TELEMETRY_ENDPOINT = "https://incoming.telemetry.mozilla.org";

// The name of the deletion-request ping.
export const DELETION_REQUEST_PING_NAME = "deletion-request";

// The maximum amount of source tags a user can set.
export const GLEAN_MAX_SOURCE_TAGS = 5;
