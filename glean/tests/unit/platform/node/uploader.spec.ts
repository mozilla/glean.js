/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import nock from "nock";

import NodeUploader from "../../../../src/platform/node/uploader";
import { DEFAULT_UPLOAD_TIMEOUT_MS, UploadResult, UploadResultStatus } from "../../../../src/core/upload/uploader";

const MOCK_ENDPOINT = "http://www.example.com";

describe("Uploader/Node", function () {
  afterEach(function () {
    nock.cleanAll();
  });

  it("returns the correct status for successful requests", async function () {
    for (const status of [200, 400, 500]) {
      // We support both plain text and binary payloads (for gzipped content)
      // so test them both.
      for (const body of ["", new Uint8Array()]) {
        nock(MOCK_ENDPOINT).post(/./i).reply(status);

        const response = NodeUploader.post(MOCK_ENDPOINT, body);
        const expectedResponse = new UploadResult(UploadResultStatus.Success, status);
        assert.deepStrictEqual(
          await response,
          expectedResponse
        );
      }
    }
  });

  it("returns the correct status for timeout requests", async function () {
    nock(MOCK_ENDPOINT).post(/./i).delay(DEFAULT_UPLOAD_TIMEOUT_MS + 1).reply(500);

    const response = NodeUploader.post(MOCK_ENDPOINT, "");
    const expectedResponse = new UploadResult(UploadResultStatus.RecoverableFailure);
    assert.deepStrictEqual(
      await response,
      expectedResponse
    );
  });

  it("returns the correct status for request errors", async function () {
    nock(MOCK_ENDPOINT).post(/./i).replyWithError({
      message: "something awful happened",
      code: "AWFUL_ERROR",
    });

    const response = NodeUploader.post(MOCK_ENDPOINT, "");
    const expectedResponse = new UploadResult(UploadResultStatus.RecoverableFailure);
    assert.deepStrictEqual(
      await response,
      expectedResponse
    );
  });
});
