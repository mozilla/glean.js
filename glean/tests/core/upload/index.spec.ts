/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { v4 as UUIDv4 } from "uuid";

import Glean from "core/glean";
import PingUploader, { UploadResultStatus } from "core/upload";

const sandbox = sinon.createSandbox();

/**
 * Fills the pings database with dummmy pings.
 *
 * @param numPings number of pings we want to add to the database.
 *
 * @returns The array of identifiers of the pings added to the database.
 */
async function fillUpPingsDatabase(numPings: number): Promise<string[]> {
  const path = "some/random/path/doesnt/matter";
  const payload = {
    ping_info: {
      seq: 1,
      start_time: "2020-01-11+01:00",
      end_time: "2020-01-12+01:00",
    },
    client_info: {
      telemetry_sdk_build: "32.0.0"
    }
  };

  const identifiers = Array.from({ length: numPings }, () => UUIDv4());
  for (const identifier of identifiers) {
    await Glean.pingsDatabase.recordPing(path, identifier, payload);
  }

  return identifiers;
}

/**
 * Waits for the uploader on the Glean singleton to end its uploading job,
 * if it's actualy doing any.
 */
async function waitForGleanUploader(): Promise<void> {
  if (Glean["pingUploader"]["currentJob"]) {
    await Glean["pingUploader"]["currentJob"];
  }
}

/**
 * Disables the uploader on the Glean singleton,
 * so that it doesn't interefe with tests.
 */
function disableGleanUploader(): void {
  sandbox.stub(Glean["pingUploader"], "triggerUpload")
    .callsFake(() => Promise.resolve());
}

describe("PingUploader", function() {
  afterEach(function () {
    sandbox.restore();
  });

  beforeEach(async function() {
    await Glean.testResetGlean("something something");
  });

  it("scanning the pending pings directory fills up the queue", async function() {
    disableGleanUploader();
    await fillUpPingsDatabase(10);

    const uploader = new PingUploader();
    await uploader.scanPendingPings();
    assert.strictEqual(uploader["queue"].length, 10);
  });

  it("whenever the pings dabase records a new ping, upload is triggered", async function() {
    const spy = sandbox.spy(Glean["pingUploader"], "triggerUpload");
    await fillUpPingsDatabase(10);
    assert.strictEqual(spy.callCount, 10);
  });

  it("when upload is triggered, all pings are processed", async function() {
    disableGleanUploader();
    await fillUpPingsDatabase(10);

    const uploader = new PingUploader();
    await uploader.scanPendingPings();
    assert.strictEqual(uploader["queue"].length, 10);

    await uploader.triggerUpload();
    assert.deepStrictEqual(await Glean.pingsDatabase.getAllPings(), {});
    assert.strictEqual(uploader["queue"].length, 0);
  });

  it("if multiple pings are enqueued subsequently, we don't attempt to upload each ping more than once", async function () {
    const spy = sandbox.spy(Glean.platform.uploader, "post");
    await fillUpPingsDatabase(100);
    await waitForGleanUploader();
    assert.strictEqual(spy.callCount, 100);
  });

  it("cancelling succesfully stops ongoing upload work", async function () {
    disableGleanUploader();
    await fillUpPingsDatabase(10);

    const uploader = new PingUploader();
    await uploader.scanPendingPings();

    // Trigger uploading, but don't wait for it to finish,
    // so that it is ongoing when we cancel.
    void uploader.triggerUpload();
    await uploader.cancelUpload();

    // There is really no way to know how many pings Glean will be able to upload
    // before it is done cancelling. So we just check that there still pings enqueued.
    assert.ok(uploader["queue"].length > 0);
  });

  it("correctly deletes pings when upload is successfull", async function() {
    // There is no need to stub the upload adapter here,
    // as the default exported mock already returns a success response always.
    await fillUpPingsDatabase(10);

    await waitForGleanUploader();
    assert.deepStrictEqual(await Glean.pingsDatabase.getAllPings(), {});
    assert.strictEqual(Glean["pingUploader"]["queue"].length, 0);
  });

  it("correctly deletes pings when upload is unrecoverably unsuccesfull", async function() {
    // Always return unrecoverable failure response from upload attempt.
    sandbox.stub(Glean.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 400,
      result: UploadResultStatus.Success
    }));
    await fillUpPingsDatabase(10);

    await waitForGleanUploader();
    assert.deepStrictEqual(await Glean.pingsDatabase.getAllPings(), {});
    assert.strictEqual(Glean["pingUploader"]["queue"].length, 0);
  });

  it("correctly re-enqueues pings when upload is recovarbly unsuccesfull", async function() {
    // Always return recoverable failure response from upload attempt.
    sandbox.stub(Glean.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 500,
      result: UploadResultStatus.Success
    }));
    await fillUpPingsDatabase(1);

    await waitForGleanUploader();
    // Ping should still be there.
    const allPings = await Glean.pingsDatabase.getAllPings();
    assert.deepStrictEqual(Object.keys(allPings).length, 1);
    assert.strictEqual(Glean["pingUploader"]["queue"].length, 1);
  });

  it("duplicates are not enqueued", function() {
    const uploader = new PingUploader();
    for (let i = 0; i < 10; i++) {
      uploader["enqueuePing"]({
        identifier: "id",
        payload: {
          ping_info: {
            seq: 1,
            start_time: "2020-01-11+01:00",
            end_time: "2020-01-12+01:00",
          },
          client_info: {
            telemetry_sdk_build: "32.0.0"
          }
        },
        path: "some/path"
      });
    }

    assert.strictEqual(uploader["queue"].length, 1);
  });

  it("maximum of recoverable errors is enforced", async function () {
    // Always return recoverable failure response from upload attempt.
    const stub = sandbox.stub(Glean.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 500,
      result: UploadResultStatus.Success
    }));
    await fillUpPingsDatabase(1);

    await waitForGleanUploader();
    assert.strictEqual(stub.callCount, 3);
  });
});
