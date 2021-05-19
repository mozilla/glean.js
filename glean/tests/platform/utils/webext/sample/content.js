/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */



// Listens for messages from the tests.
// These messages are send through custom events ("test")
// and contain a request for a web extension API call.
//
// Once such a message is received it is passed on to the background script to execute.
// This is necessary because this script doesn't have access to all the web extension APIs
// and may not have access to the API requested.
//
// The background script will execute and return the response it gets.
// When this script gets the response it will dispatch another custom event ("testResponse")
// containing the response sent by the background script.
//
// Tests code will be listening for this event, see more at tests/utils/webext.index.ts,
// specifically look at the function `webExtensionAPIProxyBuilder`.
document.addEventListener("test", async (event) => {
  console.debug("Caught a new test event on the web extension!");
  try {
    const response = await browser.runtime.sendMessage({
      test: event.detail
    });
    document.dispatchEvent(new CustomEvent("testResponse", {
      detail: response.data
    }));
  } catch (e) {
    console.error("Something went wrong while talking to the background script.", e);
  }
});
