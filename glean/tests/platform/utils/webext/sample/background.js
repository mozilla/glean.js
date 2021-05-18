/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */



// Listens for messages from the content script.
// Such messages will contain an object with the following interface:
//
// {
//   // The fnIndex is the index on the API we want to access on the browser object.
//   // It works exactly like the `StorageIndex`. See src/storage/index.ts
//   fnIndex: string[],
//   // The args which we want to pass to the function found on `fnIndex`
//   args: any[]
// }
//
// This object describes a given API the caller wants to access on the `browser` object,
// and with which arguments they want to call it.
//
// Once such a message is received, this listener runs the requested API with the given arguments
// and returns the response of the call in a message with the following data:
//
// {
//   // This property is always the same.
//   // The caller should check for it to know that this is the response for their request.
//   action: "testResponse",
//   // A JSON encoded string containing the response of the API request.
//   // This must be string encoded otherwise we run into permission errors.
//   data: string
// }
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
      console.error("Something went wrong while interacting with `browser`.", e);
    }
  }
  // This return guarantees that the code above will not be killed before it is done.
  return true;
});
