/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import "jsdom-global/register";
import assert from "assert";
import sinon from "sinon";

import BrowserUploader from "../../../src/platform/webext/uploader";
import QtUploader from "../../../src/platform/qt/uploader"
import type { JSONObject } from "../../../src/core/utils";
import {DEFAULT_UPLOAD_TIMEOUT_MS, UploadResultStatus} from "../../../src/core/upload/uploader";

const sandbox = sinon.createSandbox();

global.fetch = function() {
  throw new Error("The `fetch` function should be mocked for each test run individually.");
};

class MockResponse {
  status: number;

  constructor(_blob: never, init: { status: number }) {
    this.status = init.status;
  }

  json(): Promise<JSONObject> {
    return Promise.resolve({ status: this.status });
  }
}
// Disable typescript checking here, for it not to complain about the fact that our MockResponse is not complete.
// For out intents and purposes it is complete enough.
//
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.Response = MockResponse;

class MockAbortController {
  abort() {
    throw new Error("Shouldn't get here.");
  }
}
// Disable typescript checking here, for the same reasons as above.
//
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.AbortController = MockAbortController;

/**
 * Creates a Response object with the given status.
 *
 * @param status The status of the created response.
 * @returns The created Response object.
 */
function createResponse(status: number): Response {
  return new Response("", { status });
}

describe("Uploader/browser", function () {
  afterEach(function () {
    sandbox.restore();
  });

  it("returns the status for succesful requests", async function () {
    const stub = sandbox.stub(global, "fetch");
    for (const [index, status] of [200, 400, 500].entries()) {
      stub.onCall(index).returns(Promise.resolve(createResponse(status)));
      assert.deepStrictEqual(
        await BrowserUploader.post("https://localhost:8080", ""),
        { status: status, result: UploadResultStatus.Success });
    }
  });

  it("doesn't throw if upload action throws", async function () {
    sandbox.stub(global, "fetch").callsFake(() => Promise.reject());
    assert.deepStrictEqual(
      await BrowserUploader.post("https://localhost:8080", ""),
      { result: UploadResultStatus.RecoverableFailure }
    );
  });
});

describe("Uploader/Qt", function () {
  let server: sinon.SinonFakeServer;

  beforeEach(function () {
    server = sinon.fakeServer.create();
  });

  afterEach(function () {
    server.restore();
  });

  it("returns the status for successful requests", async function () {
    for (const [index, status] of [200, 400, 500].entries()) {
      const response = QtUploader.post("/hello", "");
      server.respondWith("POST", "/hello", [status, {}, ""]);
      server.respond();
      assert.deepStrictEqual(
          await response,
          { status: status, result: UploadResultStatus.Success });
    }
  });

  it("timeout", async function () {
    const clock = sinon.useFakeTimers();
    const response = QtUploader.post("/hello", "");
    clock.tick(DEFAULT_UPLOAD_TIMEOUT_MS + 1);
    server.respondWith("POST", "/hello", [200, {}, ""]);
    server.respond();
    assert.deepStrictEqual(
        await response,
        { result: UploadResultStatus.RecoverableFailure });
  });
});