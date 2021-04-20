/* eslint-disable */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * A custom ping to help showcase Glean.js.
 * It is sent everytime the user clicks the "Submit ping" button
 * on this sample app.
 *
 * Generated from `custom`.
 */
const custom = new Glean.Glean.default._private.PingType({
    includeClientId: true,
    sendIfEmpty: false,
    name: "custom",
    reasonCodes: [],
}, );
