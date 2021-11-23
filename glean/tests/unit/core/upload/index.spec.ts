/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { v4 as UUIDv4 } from "uuid";

import { Configuration } from "../../../../src/core/config";
import { Context } from "../../../../src/core/context";
import Glean from "../../../../src/core/glean";
import PingUploader, { MAX_PINGS_PER_INTERVAL } from "../../../../src/core/upload";
import { UploadResultStatus } from "../../../../src/core/upload/uploader";
import { CounterUploader, WaitableUploader } from "../../../utils";
import { DELETION_REQUEST_PING_NAME } from "../../../../src/core/constants";
import PingsDatabase from "../../../../src/core/pings/database";
import { makePath } from "../../../../src/core/pings/maker";
import Policy from "../../../../src/core/upload/policy";

const sandbox = sinon.createSandbox();

describe("PingUploader", function() {
  const testAppId = `gleanjs.test.${this.title}`;
  let pingsDatabase: PingsDatabase;

  /**
   * Fills the pings database with dummmy pings.
   *
   * @param numPings number of pings we want to add to the database.
   * @param pingName the name of the ping to fill the database with, defaults to "ping".
   * @returns The array of identifiers of the pings added to the database.
   */
  async function fillUpPingsDatabase(
    numPings: number,
    pingName = "ping"
  ): Promise<string[]> {
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
      const path = makePath(
        identifier,
        { name: pingName, includeClientId: true, sendIfEmpty: true }
      );
      await pingsDatabase.recordPing(path, identifier, payload);
    }

    return identifiers;
  }

  before(async function () {
    // We call this only once so that the platform is set
    // and we are able to create a pings database.
    await Glean.testResetGlean(testAppId, true);
    pingsDatabase = new PingsDatabase();
  });

  afterEach(async function () {
    await pingsDatabase.clearAll();
    sandbox.restore();
  });

  it("whenever the pings database records a new ping, upload is triggered", async function() {
    const httpClient = new WaitableUploader();
    const uploader = new PingUploader(new Configuration({ httpClient }), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    const uploadedPings = httpClient.waitForBatchPingSubmission("ping", 10);
    await fillUpPingsDatabase(10);
    await uploader.testBlockOnPingsQueue();
    assert.strictEqual((await uploadedPings).length, 10);
  });

  it("clearing succesfully stops ongoing upload work", async function () {
    const httpClient = new CounterUploader();
    const uploader = new PingUploader(new Configuration({ httpClient }), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    await fillUpPingsDatabase(10);
    await uploader.clearPendingPingsQueue();

    // There is really no way to know how many pings Glean will be able to upload
    // before it is done clearing. So we just check that post was called less than 10 times.
    assert.ok(httpClient.count < 10);
  });

  it("clearing does not clear deletion-request ping job", async function () {
    const httpClient = new WaitableUploader();
    const postSpy = sandbox.spy(httpClient, "post");
    const uploader = new PingUploader(new Configuration({ httpClient }), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    await fillUpPingsDatabase(10);
    await fillUpPingsDatabase(1, DELETION_REQUEST_PING_NAME);

    const waitForDeletionRequestPing = httpClient.waitForPingSubmission(DELETION_REQUEST_PING_NAME);
    await uploader.clearPendingPingsQueue();

    // This throws in case the deletion-request ping is not sent.
    await waitForDeletionRequestPing;

    // Check that even though the deletion-request ping was sent for sure,
    // the previously enqueued pings were not all sent.
    assert.ok(postSpy.callCount < 11);
  });

  it("shutdown finishes executing requests before stopping", async function () {
    const httpClient = new CounterUploader();
    const uploader = new PingUploader(new Configuration({ httpClient }), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    await fillUpPingsDatabase(10);
    await uploader.shutdown();

    assert.strictEqual(httpClient.count, 10);
  });

  it("shutdown only executes a fraction of the requests if rate limit is hit", async function () {
    const httpClient = new CounterUploader();
    const uploader = new PingUploader(new Configuration({ httpClient }), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    await fillUpPingsDatabase(MAX_PINGS_PER_INTERVAL + 5);
    await uploader.shutdown();

    assert.strictEqual(httpClient.count, MAX_PINGS_PER_INTERVAL);
  });

  it("correctly deletes pings when upload is successfull", async function() {
    const uploader = new PingUploader(new Configuration(), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    // There is no need to stub the upload adapter here,
    // as the default exported mock already returns a success response always.
    await fillUpPingsDatabase(10);

    await uploader.testBlockOnPingsQueue();
    assert.deepStrictEqual(await Context.pingsDatabase.getAllPings(), []);
  });

  it("correctly deletes pings when upload is unrecoverably unsuccesfull", async function() {
    // Always return unrecoverable failure response from upload attempt.
    sandbox.stub(Context.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 400,
      result: UploadResultStatus.Success
    }));

    const uploader = new PingUploader(new Configuration(), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    await fillUpPingsDatabase(10);
    await uploader.testBlockOnPingsQueue();
    assert.deepStrictEqual(await Context.pingsDatabase.getAllPings(), []);
  });

  it("correctly re-enqueues pings when upload is recoverably unsuccesfull", async function() {
    // Always return recoverable failure response from upload attempt.
    sandbox.stub(Context.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 500,
      result: UploadResultStatus.Success
    }));

    const uploader = new PingUploader(new Configuration(), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    await fillUpPingsDatabase(1);
    await uploader.testBlockOnPingsQueue();
    // Ping should still be there.
    const allPings = await Context.pingsDatabase.getAllPings();
    assert.deepStrictEqual(Object.keys(allPings).length, 1);
  });

  it("duplicates are not enqueued", async function() {
    const httpClient = new CounterUploader();
    const uploader = new PingUploader(new Configuration({ httpClient }), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    for (let i = 0; i < 10; i++) {
      uploader["enqueuePing"]({
        collectionDate: (new Date()).toISOString(),
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

    await uploader.testBlockOnPingsQueue();
    assert.strictEqual(httpClient.count, 1);
  });

  it("maximum of recoverable errors is enforced", async function () {
    // Always return recoverable failure response from upload attempt.
    const stub = sandbox.stub(Context.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 500,
      result: UploadResultStatus.Success
    }));

    // Create a new ping uploader with a fixed max recoverable failures limit.
    const uploader = new PingUploader(
      new Configuration(),
      pingsDatabase,
      new Policy(
        3, // maxRecoverableFailures
      )
    );
    pingsDatabase.attachObserver(uploader);

    await fillUpPingsDatabase(1);
    await uploader.testBlockOnPingsQueue();

    assert.strictEqual(stub.callCount, 3);
  });

  it("pings which exceed max ping body size are not sent", async function () {
    const httpClient = new CounterUploader();
    // Create a new ping uploader with a very low max ping body size,
    // so that virtually any ping body will throw an error.
    const uploader = new PingUploader(
      new Configuration({ httpClient }),
      pingsDatabase,
      new Policy(
        3, // maxRecoverableFailures
        1 // maxPingBodySize
      )
    );
    pingsDatabase.attachObserver(uploader);

    // Add a bunch of pings to the database, in order to trigger upload attempts on the uploader.
    await fillUpPingsDatabase(10);
    await uploader.testBlockOnPingsQueue();

    // Check that none of those pings were actually sent.
    assert.strictEqual(httpClient.count, 0);

    // Check that queue is empty and all large pings were discarded.
    assert.strictEqual(uploader["processing"].length, 0);
  });

  it("correctly build ping request", async function () {
    const postSpy = sandbox.spy(Context.platform.uploader, "post");

    const uploader = new PingUploader(new Configuration(), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    const expectedDocumentId = (await fillUpPingsDatabase(1))[0];
    await uploader.testBlockOnPingsQueue();

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

  it("dispatcher is only once stopped if upload limits are hit and is immediatelly restarted after", async function () {
    const httpClient = new CounterUploader();
    const uploader = new PingUploader(new Configuration({ httpClient }), pingsDatabase);
    pingsDatabase.attachObserver(uploader);

    const stopSpy = sandbox.spy(uploader["dispatcher"], "stop");
    await fillUpPingsDatabase((MAX_PINGS_PER_INTERVAL * 2) - 1);
    await uploader.testBlockOnPingsQueue();
    assert.strictEqual(1, stopSpy.callCount);

    // Reset the rate limiter so that we are not throttled anymore.
    uploader["rateLimiter"]["reset"]();

    // Add one more ping to the queue so that uploading is resumed.
    await fillUpPingsDatabase(1);
    await uploader.testBlockOnPingsQueue();
    assert.strictEqual(httpClient.count, MAX_PINGS_PER_INTERVAL * 2);
  });
});
