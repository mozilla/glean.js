/* eslint-disable */

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

/**
 * The time the sample app was started.
 */
const appStarted = new Glean.Glean.default._private.DatetimeMetricType({
    category: "sample",
    name: "app_started",
    sendInPings: ["custom"],
    lifetime: "ping",
    disabled: false,
}, "millisecond");

/**
 * The number of time the "Record" button was clicked.
 */
const buttonClicked =  new Glean.Glean.default._private.CounterMetricType({
    category: "sample",
    name: "button_clicked",
    sendInPings: ["custom"],
    lifetime: "ping",
    disabled: false,
}, );
