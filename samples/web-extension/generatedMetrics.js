/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "glean";

export const webExtStarted = new Glean._private.DatetimeMetricType({
  category: "sample",
  name: "webext_installed",
  sendInPings: ["sample"],
  lifetime: "ping",
  disabled: false
}, "millisecond");

export const popupOpened = new Glean._private.CounterMetricType({
  category: "sample",
  name: "popup_opened",
  sendInPings: ["sample"],
  lifetime: "ping",
  disabled: false
}, "millisecond");
