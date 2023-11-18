/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import "jsdom-global/register";
import assert from "assert";
import sinon from "sinon";
import nock from "nock";
import fetch from "node-fetch";

import BrowserUploader from "../../../../src/platform/browser/uploader";
import { UploadResult, UploadResultStatus } from "../../../../src/core/upload/uploader";
import PingRequest from "../../../../src/core/upload/ping_request";

const sandbox = sinon.createSandbox();

const MOCK_ENDPOINT = "http://www.example.com";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.fetch = fetch;

describe("Uploader/Browser", function () {
  afterEach(function () {
    sandbox.restore();
  });

  it("returns the correct status for successful requests", async function () {
    for (const status of [200, 400, 500]) {
      nock(MOCK_ENDPOINT).post(/./i).reply(status);

      const response = BrowserUploader.post(MOCK_ENDPOINT, new PingRequest("abc", {}, "{}", 1024));
      const expectedResponse = new UploadResult(UploadResultStatus.Success, status);
      assert.deepStrictEqual(
        await response,
        expectedResponse
      );
    }
  });

  it("returns the correct status for timeout requests", async function () {
    const TEST_TIMEOUT_MS = 100;
    const ORIGINAL_TIMEOUT_MS = BrowserUploader.timeoutMs;
    BrowserUploader.timeoutMs = TEST_TIMEOUT_MS;

    nock(MOCK_ENDPOINT).post(/./i).delay(TEST_TIMEOUT_MS + 1).reply(500);

    const response = BrowserUploader.post(MOCK_ENDPOINT, new PingRequest("abc", {}, "{}", 1024));
    const expectedResponse = new UploadResult(UploadResultStatus.RecoverableFailure);
    assert.deepStrictEqual(
      await response,
      expectedResponse
    );
    BrowserUploader.timeoutMs = ORIGINAL_TIMEOUT_MS;
  });

  it("returns the correct status for request errors", async function () {
    nock(MOCK_ENDPOINT).post(/./i).replyWithError({
      message: "something awful happened",
      code: "AWFUL_ERROR",
    });

    const response = BrowserUploader.post(MOCK_ENDPOINT, new PingRequest("abc", {}, "{}", 1024));
    const expectedResponse = new UploadResult(UploadResultStatus.RecoverableFailure);
    assert.deepStrictEqual(
      await response,
      expectedResponse
    );
  });
});
