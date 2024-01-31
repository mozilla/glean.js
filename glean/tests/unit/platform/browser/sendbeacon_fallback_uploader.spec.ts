/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import "jsdom-global/register";
import assert from "assert";
import sinon from "sinon";
import nock from "nock";
import fetch from "node-fetch";

import BrowserSendBeaconFallbackUploader from "../../../../src/platform/browser/sendbeacon_fallback_uploader";
import { UploadResult, UploadResultStatus } from "../../../../src/core/upload/uploader";
import PingRequest from "../../../../src/core/upload/ping_request";

const sandbox = sinon.createSandbox();

const MOCK_ENDPOINT = "http://www.example.com";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
// eslint-disable-next-line jsdoc/require-jsdoc
function setGlobalSendBeacon() {
  global.navigator.sendBeacon = (url: string, content: string): boolean => {
    void fetch(url, {
      body: content,
      method: "POST",
    });

    return true;
  };
}
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.fetch = fetch;

describe("Uploader/BrowserSendBeaconFallback", function () {
  beforeEach(function() {
    setGlobalSendBeacon();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("returns the correct status for successful requests", async function () {
    const TEST_PING_CONTENT = {"my-test-value": 40721};
    for (const status of [200, 400, 500]) {
      nock(MOCK_ENDPOINT).post(/./i, body => {
        return JSON.stringify(body) == JSON.stringify(TEST_PING_CONTENT);
      }).reply(status);

      const response = BrowserSendBeaconFallbackUploader.post(MOCK_ENDPOINT, new PingRequest("abc", {}, JSON.stringify(TEST_PING_CONTENT), 1024));
      // When using sendBeacon, we can't really tell if something was correctly uploaded
      // or not. All we can know is if the request was enqueued, so we always expect 200.
      const expectedResponse = new UploadResult(UploadResultStatus.Success, 200);
      assert.deepStrictEqual(
        await response,
        expectedResponse
      );
    }
  });

  it("returns the correct status after fallback", async function () {
    const TEST_PING_CONTENT = {"my-test-value": 40721};
    nock(MOCK_ENDPOINT).post(/./i).reply(200);

    // Reset `fetch` to a known state.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetch;

    // Ensure `sendBeacon` fails.
    global.navigator.sendBeacon = () => false;

    const response = BrowserSendBeaconFallbackUploader.post(MOCK_ENDPOINT, new PingRequest("abc", {}, JSON.stringify(TEST_PING_CONTENT), 1024));
    const expectedResponse = new UploadResult(UploadResultStatus.Success, 200);
    assert.deepStrictEqual(
      await response,
      expectedResponse
    );
  });

  it("returns the correct status when both uploads fail", async function () {
    nock(MOCK_ENDPOINT).post(/./i).replyWithError({
      message: "something awful happened",
      code: "AWFUL_ERROR",
    });

    // Reset `fetch` to a known state.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetch;

    // Ensure `sendBeacon` fails.
    global.navigator.sendBeacon = () => false;

    const response = BrowserSendBeaconFallbackUploader.post(MOCK_ENDPOINT, new PingRequest("abc", {}, "{}", 1024));
    const expectedResponse = new UploadResult(UploadResultStatus.RecoverableFailure);
    assert.deepStrictEqual(
      await response,
      expectedResponse
    );
  });
});
