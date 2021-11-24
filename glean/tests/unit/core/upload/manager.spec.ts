/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { v4 as UUIDv4 } from "uuid";

import { Configuration } from "../../../../src/core/config";
import { Context } from "../../../../src/core/context";
import Glean from "../../../../src/core/glean";
import PingUploadManager from "../../../../src/core/upload/manager";
import { UploadResultStatus } from "../../../../src/core/upload/uploader";
import { CounterUploader, WaitableUploader } from "../../../utils";
import { DELETION_REQUEST_PING_NAME } from "../../../../src/core/constants";
import PingsDatabase from "../../../../src/core/pings/database";
import { makePath } from "../../../../src/core/pings/maker";
import Policy from "../../../../src/core/upload/policy";

const sandbox = sinon.createSandbox();

describe("PingUploadManager", function() {
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
    const uploader = new PingUploadManager(new Configuration({ httpClient }), pingsDatabase);

    const uploadedPings = httpClient.waitForBatchPingSubmission("ping", 10);
    await fillUpPingsDatabase(10);
    await uploader.blockOnOngoingUploads();
    assert.strictEqual((await uploadedPings).length, 10);
  });

  it("clearing succesfully stops ongoing upload work", async function () {
    const httpClient = new CounterUploader();
    const uploader = new PingUploadManager(new Configuration({ httpClient }), pingsDatabase);

    await fillUpPingsDatabase(10);
    await uploader.clearPendingPingsQueue();

    // There is really no way to know how many pings Glean will be able to upload
    // before it is done clearing. So we just check that post was called less than 10 times.
    assert.ok(httpClient.count < 10);
  });

  it("clearing does not clear deletion-request ping job", async function () {
    const httpClient = new WaitableUploader();
    const postSpy = sandbox.spy(httpClient, "post");
    const uploader = new PingUploadManager(new Configuration({ httpClient }), pingsDatabase);

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

  it("correctly deletes pings when upload is successfull", async function() {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);

    // There is no need to stub the upload adapter here,
    // as the default exported mock already returns a success response always.
    await fillUpPingsDatabase(10);

    await uploader.blockOnOngoingUploads();
    assert.deepStrictEqual(await Context.pingsDatabase.getAllPings(), []);
  });

  it("correctly deletes pings when upload is unrecoverably unsuccesfull", async function() {
    // Always return unrecoverable failure response from upload attempt.
    sandbox.stub(Context.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 400,
      result: UploadResultStatus.Success
    }));

    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);

    await fillUpPingsDatabase(10);
    await uploader.blockOnOngoingUploads();
    const allPings = await Context.pingsDatabase.getAllPings();
    assert.deepStrictEqual(Object.keys(allPings).length, 0);
  });

  it("correctly re-enqueues pings when upload is recoverably unsuccesfull", async function() {
    // Always return recoverable failure response from upload attempt.
    sandbox.stub(Context.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 500,
      result: UploadResultStatus.Success
    }));

    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);

    await fillUpPingsDatabase(1);
    await uploader.blockOnOngoingUploads();
    // Ping should still be there.
    const allPings = await Context.pingsDatabase.getAllPings();
    assert.deepStrictEqual(Object.keys(allPings).length, 1);
  });

  it("duplicates are not enqueued", function() {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);

    for (let i = 0; i < 10; i++) {
      // Note: We are using enqueuePing directly here,
      // which means the worker will never be started and no ping will be uploaded.
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

    assert.strictEqual(uploader["queue"].length, 1);
  });

  it("maximum of recoverable errors is enforced", async function () {
    // Always return recoverable failure response from upload attempt.
    const stub = sandbox.stub(Context.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 500,
      result: UploadResultStatus.Success
    }));

    // Create a new ping uploader with a fixed max recoverable failures limit.
    const uploader = new PingUploadManager(
      new Configuration(),
      pingsDatabase,
      new Policy(
        3, // maxRecoverableFailures
      )
    );

    await fillUpPingsDatabase(1);
    await uploader.blockOnOngoingUploads();

    assert.strictEqual(stub.callCount, 3);
  });
});
