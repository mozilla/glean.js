/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

browser.runtime.onMessage.addListener((data, _sender, sendResponse) => {
  console.debug("New message received.", data);
  if (data.test) {
    console.debug("It's a test event.");
    try {
      const { fnIndex, args } = data.test;
      console.debug("Sending message back to content script...");
      let fn = browser;
      for (const key of fnIndex) {
        fn = fn[key];
      }
      fn(...args).then(data => {
        sendResponse({
          action: "testResponse",
          data: JSON.stringify(data)
        });
      });
    } catch(e) {
      console.error("Something went wrong while interacting with the storage.", e);
    }
  }
  // This return guarantees that the code above will not be killed before it is done.
  return true;
});
