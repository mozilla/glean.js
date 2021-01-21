/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

import Glean from "glean";

// TODO: Once we have glean_parser generating pings and metrics,
// remove this code.
const samplePing = new Glean._private.PingType("sample", true, false);
const webExtStarted = new Glean._private.DatetimeMetricType({
  category: "sample",
  name: "webext_installed",
  sendInPings: ["sample"],
  lifetime: "ping",
  disabled: false
}, "millisecond");
const popupOpened = new Glean._private.CounterMetricType({
  category: "sample",
  name: "popup_opened",
  sendInPings: ["sample"],
  lifetime: "ping",
  disabled: false
}, "millisecond");

Glean.initialize("web-extension", true)
  .then(() => {
    console.log("Glean has been succesfully initialized.");
    webExtStarted.set()
      .then(() => console.log("`webext-installed` was succesfully set."));
  });

// Listen for messages from the popup.
browser.runtime.onMessage.addListener(msg => {
  console.log(`New message received! ${msg}`);

  if (msg === "popup-opened") {
    popupOpened.add()
      .then(() => console.log("`popup-opened` was succesfully added."));
  }

  if (msg === "send-ping") {
    samplePing.submit()
      .then(wasSubmitted => {
        console.log(
          `Attempted to send ping "${samplePing.name}". Was the ping sent? ${wasSubmitted}`);
      });
  }
});

