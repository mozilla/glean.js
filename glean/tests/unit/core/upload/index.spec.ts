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
import Uploader, { UploadResult, UploadResultStatus } from "../../../../src/core/upload/uploader";
import { WaitableUploader } from "../../../utils";

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

describe("PingUploader", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  afterEach(function () {
    sandbox.restore();
  });

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  it("whenever the pings dabase records a new ping, upload is triggered", async function() {
    const httpClient = new WaitableUploader();
    await Glean.testResetGlean(testAppId, true, { httpClient });

    const uploadedPings = httpClient.waitForBatchPingSubmission("ping", 10);
    await fillUpPingsDatabase(10);
    await Glean["pingUploader"].testBlockOnPingsQueue();
    assert.strictEqual((await uploadedPings).length, 10);
  });

  it("clearing succesfully stops ongoing upload work", async function () {
    class CounterUploader implements Uploader {
      public count = 0;
      async post(_url: string, _body: string): Promise<UploadResult> {
        this.count++;
        // Make this just a tiny bit slow.
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), 10 * Math.random())
        })

        return {
          status: 200,
          result: UploadResultStatus.Success
        }
      }
    }

    const httpClient =  new CounterUploader();
    await Glean.testResetGlean(testAppId, true, { httpClient });

    await fillUpPingsDatabase(10);
    Glean["pingUploader"].clearPendingPingsQueue();
    await Glean["pingUploader"].testBlockOnPingsQueue();

    // There is really no way to know how many pings Glean will be able to upload
    // before it is done clearing. So we just check that post was called less than 10 times.
    assert.ok(httpClient.count < 10);
  });

  it("correctly deletes pings when upload is successfull", async function() {
    // There is no need to stub the upload adapter here,
    // as the default exported mock already returns a success response always.
    await fillUpPingsDatabase(10);

    await Glean["pingUploader"].testBlockOnPingsQueue();
    assert.deepStrictEqual(await Context.pingsDatabase.getAllPings(), {});
  });

  it("correctly deletes pings when upload is unrecoverably unsuccesfull", async function() {
    // Always return unrecoverable failure response from upload attempt.
    sandbox.stub(Glean.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 400,
      result: UploadResultStatus.Success
    }));
    await fillUpPingsDatabase(10);
    await Glean["pingUploader"].testBlockOnPingsQueue();
    assert.deepStrictEqual(await Context.pingsDatabase.getAllPings(), {});
  });

  it("correctly re-enqueues pings when upload is recoverably unsuccesfull", async function() {
    // Always return recoverable failure response from upload attempt.
    sandbox.stub(Glean.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 500,
      result: UploadResultStatus.Success
    }));
    await fillUpPingsDatabase(1);

    await Glean["pingUploader"].testBlockOnPingsQueue();
    // Ping should still be there.
    const allPings = await Context.pingsDatabase.getAllPings();
    assert.deepStrictEqual(Object.keys(allPings).length, 1);
  });

  it("duplicates are not enqueued", function() {
    // Don't initialize to keep the dispatcher in an uninitialized state
    // thus making sure no upload attempt is executed and we can look at the dispatcher queue.
    const uploader = new PingUploader(new Configuration(), Glean.platform, Context.pingsDatabase);
    // Stop the dispatcher so that pings can be enqueued but not sent.
    uploader["dispatcher"].stop();

    for (let i = 0; i < 10; i++) {
      uploader["enqueuePing"]({
        identifier: "id",
        retries: 0,
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

    assert.strictEqual(uploader["dispatcher"]["queue"].length, 1);
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
    await uploader.testBlockOnPingsQueue();

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
    await uploader.testBlockOnPingsQueue();

    // Check that none of those pings were actually sent.
    assert.strictEqual(spy.callCount, 0);
  });

  it("correctly build ping request", async function () {
    const postSpy = sandbox.spy(Glean.platform.uploader, "post");

    const expectedDocumentId = (await fillUpPingsDatabase(1))[0];
    await Glean["pingUploader"].testBlockOnPingsQueue();

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
