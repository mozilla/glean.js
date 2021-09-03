/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import "jsdom-global/register";
import assert from "assert";
import sinon from "sinon";

import QtUploader from "../../../../src/platform/qt/uploader";
import { DEFAULT_UPLOAD_TIMEOUT_MS, UploadResult, UploadResultStatus } from "../../../../src/core/upload/uploader";

describe("Uploader/Qt", function () {
  let server: sinon.SinonFakeServer;

  beforeEach(function () {
    server = sinon.fakeServer.create();
  });

  afterEach(function () {
    server.restore();
  });

  it("returns the status for successful requests", async function () {
    for (const status of [200, 400, 500]) {
      const response = QtUploader.post("/hello", "");
      server.respondWith("POST", "/hello", [status, {}, ""]);
      server.respond();
      const expectedResponse = new UploadResult(UploadResultStatus.Success, status);
      assert.deepStrictEqual(
        await response,
        expectedResponse);
    }
  });

  it("returns the status for timeout request", async function () {
    const clock = sinon.useFakeTimers();
    const response = QtUploader.post("/hello", "");
    clock.tick(DEFAULT_UPLOAD_TIMEOUT_MS + 1);
    server.respondWith("POST", "/hello", [200, {}, ""]);
    server.respond();
    const expectedResponse = new UploadResult(UploadResultStatus.RecoverableFailure);
    assert.deepStrictEqual(
      await response,
      expectedResponse);
  });
});
