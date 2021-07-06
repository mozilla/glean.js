/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { v4 as UUIDv4 } from "uuid";

import { Configuration } from "../../../../src/core/config";
import { Context } from "../../../../src/core/context";
import Glean from "../../../../src/core/glean";
import PingType from "../../../../src/core/pings/ping_type";
import { collectAndStorePing } from "../../../../src/core/pings/maker";
import PingUploader, { Policy } from "../../../../src/core/upload";
import { UploadResultStatus } from "../../../../src/core/upload/uploader";

const sandbox = sinon.createSandbox();

/**
 * Fills the pings database with dummmy pings.
 *
 * @param numPings number of pings we want to add to the database.
 * @returns The array of identifiers of the pings added to the database.
 */
async function fillUpPingsDatabase(numPings: number): Promise<string[]> {
  const ping = new PingType({
    name: "ping",
    includeClientId: true,
    sendIfEmpty: true,
  });

  const identifiers = Array.from({ length: numPings }, () => UUIDv4());
  for (const identifier of identifiers) {
    await collectAndStorePing(identifier, ping);
  }

  return identifiers;
}

/**
 * Waits for a PingUploader to end its uploading job,
 * if it's actualy doing any.
 *
 * By default will wait for the uploader on the Glean singleton.
 *
 * @param uploader The uploader to wait for.
 */
async function waitForUploader(uploader = Glean["pingUploader"]): Promise<void> {
  if (uploader["currentJob"]) {
    await uploader["currentJob"];
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
  const testAppId = `gleanjs.test.${this.title}`;

  afterEach(function () {
    sandbox.restore();
  });

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  it("whenever the pings dabase records a new ping, upload is triggered", async function() {
    const spy = sandbox.spy(Glean["pingUploader"], "triggerUpload");
    await fillUpPingsDatabase(10);
    assert.strictEqual(spy.callCount, 10);
  });

  it("when upload is triggered, all pings are processed", async function() {
    disableGleanUploader();
    await fillUpPingsDatabase(10);

    // Create a new uploader and attach it to the existing storage.
    const uploader = new PingUploader(new Configuration(), Glean.platform, Context.pingsDatabase);
    Context.pingsDatabase.attachObserver(uploader);

    // Mock the 'triggerUpload' function so that 'scanPendingPings' does not
    // mistakenly trigger ping submission. Note that since we're swapping
    // the function back later in this test, we can safely shut down the linter.

    // eslint-disable-next-line @typescript-eslint/unbound-method
    const uploadTriggerFunc = uploader.triggerUpload;
    uploader.triggerUpload = async () => {
      // Intentionally empty.
    };

    await Context.pingsDatabase.scanPendingPings();
    assert.strictEqual(uploader["queue"].length, 10);

    uploader.triggerUpload = uploadTriggerFunc;
    await uploader.triggerUpload();
    assert.deepStrictEqual(await Context.pingsDatabase.getAllPings(), {});
    assert.strictEqual(uploader["queue"].length, 0);
  });

  it("if multiple pings are enqueued subsequently, we don't attempt to upload each ping more than once", async function () {
    const spy = sandbox.spy(Glean.platform.uploader, "post");
    await fillUpPingsDatabase(100);
    await waitForUploader();
    assert.strictEqual(spy.callCount, 100);
  });

  it("cancelling succesfully stops ongoing upload work", async function () {
    disableGleanUploader();
    await fillUpPingsDatabase(10);

    const uploader = new PingUploader(new Configuration(), Glean.platform, Context.pingsDatabase);
    Context.pingsDatabase.attachObserver(uploader);
    await Context.pingsDatabase.scanPendingPings();

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

    await waitForUploader();
    assert.deepStrictEqual(await Context.pingsDatabase.getAllPings(), {});
    assert.strictEqual(Glean["pingUploader"]["queue"].length, 0);
  });

  it("correctly deletes pings when upload is unrecoverably unsuccesfull", async function() {
    // Always return unrecoverable failure response from upload attempt.
    sandbox.stub(Glean.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 400,
      result: UploadResultStatus.Success
    }));
    await fillUpPingsDatabase(10);

    await waitForUploader();
    assert.deepStrictEqual(await Context.pingsDatabase.getAllPings(), {});
    assert.strictEqual(Glean["pingUploader"]["queue"].length, 0);
  });

  it("correctly re-enqueues pings when upload is recovarbly unsuccesfull", async function() {
    // Always return recoverable failure response from upload attempt.
    sandbox.stub(Glean.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 500,
      result: UploadResultStatus.Success
    }));
    await fillUpPingsDatabase(1);

    await waitForUploader();
    // Ping should still be there.
    const allPings = await Context.pingsDatabase.getAllPings();
    assert.deepStrictEqual(Object.keys(allPings).length, 1);
    assert.strictEqual(Glean["pingUploader"]["queue"].length, 1);
  });

  it("duplicates are not enqueued", function() {
    const uploader = new PingUploader(new Configuration(), Glean.platform, Context.pingsDatabase);
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

    // Create a new ping uploader with a fixed max recoverable failures limit.
    const uploader = new PingUploader(
      new Configuration(),
      Glean.platform,
      Context.pingsDatabase,
      new Policy(
        3, // maxRecoverableFailures
      )
    );

    // Overwrite the Glean ping uploader with the test one.
    Context.pingsDatabase.attachObserver(uploader);

    await fillUpPingsDatabase(1);
    await waitForUploader(uploader);

    assert.strictEqual(stub.callCount, 3);
  });

  it("pings which exceed max ping body size are not sent", async function () {
    // Create a new ping uploader with a very low max ping body size,
    // so that virtually any ping body will throw an error.
    const uploader = new PingUploader(
      new Configuration(),
      Glean.platform,
      Context.pingsDatabase,
      new Policy(
        3, // maxRecoverableFailures
        1 // maxPingBodySize
      )
    );

    // Overwrite the Glean ping uploader with the test one.
    Context.pingsDatabase.attachObserver(uploader);

    const spy = sandbox.spy(Glean.platform.uploader, "post");
    // Add a bunch of pings to the database, in order to trigger upload attempts on the uploader.
    await fillUpPingsDatabase(10);
    await waitForUploader(uploader);

    // Check that none of those pings were actually sent.
    assert.strictEqual(spy.callCount, 0);
  });

  it("correctly build ping request", async function () {
    const postSpy = sandbox.spy(Glean.platform.uploader, "post");

    const expectedDocumentId = (await fillUpPingsDatabase(1))[0];
    await waitForUploader();

    const url = postSpy.firstCall.args[0].split("/");
    const appId = url[url.length - 4];
    const documentId = url[url.length - 1];
    const headers = postSpy.firstCall.args[2] || {};

    assert.strictEqual(documentId, expectedDocumentId);
    assert.strictEqual(appId, Context.applicationId);

    assert.ok("Date" in headers);
    assert.ok("Content-Length" in headers);
    assert.ok("Content-Type" in headers);
    assert.ok("X-Client-Type" in headers);
    assert.ok("X-Client-Version" in headers);
    assert.ok("X-Telemetry-Agent" in headers);
  });
});
