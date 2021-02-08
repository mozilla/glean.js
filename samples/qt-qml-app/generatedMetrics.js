/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const appStarted = new Glean.Glean._private.DatetimeMetricType({
  category: "sample",
  name: "app_started",
  sendInPings: ["sample"],
  lifetime: "ping",
  disabled: false
}, "millisecond");

const buttonClicked = new Glean.Glean._private.CounterMetricType({
  category: "sample",
  name: "button_clicked",
  sendInPings: ["sample"],
  lifetime: "ping",
  disabled: false
}, "millisecond");
