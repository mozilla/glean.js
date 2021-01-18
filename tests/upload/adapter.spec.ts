/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import "jsdom-global/register";
import assert from "assert";
import sinon from "sinon";

import { UploadResultStatus } from "upload";
import BrowserUploadAdapter from "upload/adapter/browser";
import { JSONObject } from "utils";

const sandbox = sinon.createSandbox();

global.fetch = sinon.stub();

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
 *
 * @returns The created Response object.
 */
function createResponse(status: number): Response {
  return new Response("", { status });
}

describe("UploadAdapter/browser", function () {
  afterEach(async function () {
    sandbox.restore();
  });

  it("returns the status for succesfull requests", async function () {
    const stub = sandbox.stub(global, "fetch");
    for (const [index, status] of [200, 400, 500].entries()) {
      stub.onCall(index).returns(Promise.resolve(createResponse(status)));
      assert.deepStrictEqual(
        await BrowserUploadAdapter.post(new URL("htpps://localhost:8080"), ""),
        { status: status, result: UploadResultStatus.Success });
    }
  });

  it("doesn't throw if upload action throws", async function () {
    sandbox.stub(global, "fetch").callsFake(() => Promise.reject());
    assert.deepStrictEqual(
      await BrowserUploadAdapter.post(new URL("htpps://localhost:8080"), ""),
      { result: UploadResultStatus.RecoverableFailure }
    );
  });
});
