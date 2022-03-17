/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { v4 as UUIDv4 } from "uuid";

import { Configuration } from "../../../../src/core/config";
import { Context } from "../../../../src/core/context";
import PingUploadManager from "../../../../src/core/upload/manager";
import { UploadResult, UploadResultStatus } from "../../../../src/core/upload/uploader";
import { CounterUploader, WaitableUploader } from "../../../utils";
import { DELETION_REQUEST_PING_NAME } from "../../../../src/core/constants";
import PingsDatabase from "../../../../src/core/pings/database";
import { makePath } from "../../../../src/core/pings/maker";
import Policy from "../../../../src/core/upload/policy";
import type { Upload_UploadTask } from "../../../../src/core/upload/task";
import { UploadTaskTypes } from "../../../../src/core/upload/task";
import { MAX_PINGS_PER_INTERVAL } from "../../../../src/core/upload/rate_limiter";
import { testResetGlean } from "../../../../src/core/testing";

const sandbox = sinon.createSandbox();
const MOCK_PAYLOAD = {
  ping_info: {
    seq: 1,
    start_time: "2020-01-11+01:00",
    end_time: "2020-01-12+01:00",
  },
  client_info: {
    telemetry_sdk_build: "32.0.0"
  }
};

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
    const identifiers = Array.from({ length: numPings }, () => UUIDv4());
    for (const identifier of identifiers) {
      const path = makePath(
        identifier,
        { name: pingName, includeClientId: true, sendIfEmpty: true }
      );
      await pingsDatabase.recordPing(path, identifier, MOCK_PAYLOAD);
    }

    return identifiers;
  }

  before(async function () {
    // We call this only once so that the platform is set
    // and we are able to create a pings database.
    await testResetGlean(testAppId, true);
    pingsDatabase = new PingsDatabase();
  });

  afterEach(async function () {
    await pingsDatabase.clearAll();
    sandbox.restore();
  });

  it("attempting to get an upload task when the queue is empty doesn't cause errors", function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    assert.doesNotThrow(() => uploader.getUploadTask());
  });

  it("attempting to get an upload task returns a upload type task when there are queued pings", async function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    // Disable worker so that it is not calling `getUploadTask` in parallel.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    uploader["worker"]["work"] = () => {};

    await fillUpPingsDatabase(1);

    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Upload);
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);
  });

  it("attempting to get an upload task returns as many upload type tasks as there are", async function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    // Disable worker so that it is not calling `getUploadTask` in parallel.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    uploader["worker"]["work"] = () => {};

    await fillUpPingsDatabase(10);

    for (let i = 0; i < 10; i++) {
      assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Upload);
    }
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);
  });

  it("rate limits the amount of upload type tasks allowed", async function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    // Disable worker so that it is not calling `getUploadTask` in parallel.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    uploader["worker"]["work"] = () => {};

    await fillUpPingsDatabase(MAX_PINGS_PER_INTERVAL * 2);

    for (let i = 0; i < MAX_PINGS_PER_INTERVAL; i++) {
      assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Upload);
    }
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Wait);
  });

  it("when throttled window is complete uploading jobs can be resumed", async function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    // Disable worker so that it is not calling `getUploadTask` in parallel.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    uploader["worker"]["work"] = () => {};

    await fillUpPingsDatabase(MAX_PINGS_PER_INTERVAL + 5);

    for (let i = 0; i < MAX_PINGS_PER_INTERVAL; i++) {
      assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Upload);
    }
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Wait);

    // Manually reset the rate limiter to mock throttling period being over.
    uploader["rateLimiter"]["reset"]();

    for (let i = 0; i < 5; i++) {
      assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Upload);
    }
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);
  });

  it("new pings are added to the queue and processed while upload is in process", async function () {
    const httpClient = new CounterUploader();
    const uploader = new PingUploadManager(new Configuration({ httpClient }), pingsDatabase);

    await fillUpPingsDatabase(10);

    // Use `enqueuePing` directly to avoid calling `worker.work` again.
    // We want to check that the ping can be enqueued and processed on the same job.
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

    await uploader.blockOnOngoingUploads();
    assert.strictEqual(httpClient.count, 11);
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
        3, // maxWaitAttempts
        3, // maxRecoverableFailures
      )
    );

    await fillUpPingsDatabase(1);
    await uploader.blockOnOngoingUploads();

    assert.strictEqual(stub.callCount, 3);
  });

  it("maximum of wait attempts is enforced", async function () {
    // Create a new ping uploader with a fixed max wait attempts limit.
    const uploader = new PingUploadManager(
      new Configuration(),
      pingsDatabase,
      new Policy(
        3, // maxWaitAttempts
      )
    );

    // Fill up the pings database and exceed the rate limit.
    await fillUpPingsDatabase(MAX_PINGS_PER_INTERVAL + 5);
    // Wait for the worker to finish processing the ping requests.
    // It should stop when it receives a `Wait_UploadTask`.
    await uploader.blockOnOngoingUploads();

    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Wait);
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Wait);
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);
  });

  it("throttling doesn't kick in if we are right on the limit of allowed pings per interval", async function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);

    // Fill up the pings database right at the limit of allowed pings per interval.
    await fillUpPingsDatabase(MAX_PINGS_PER_INTERVAL);
    // Wait for the worker to finish processing the ping requests.
    await uploader.blockOnOngoingUploads();

    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);
  });

  it("pings cannot be re-enqueued while they are being processed", async function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    // Disable the PingUploadWorker so it does not interfere with these tests
    uploader["worker"]["workInternal"] = () => Promise.resolve();

    // Enqueue a ping and start processing it
    const [ identifier ] = await fillUpPingsDatabase(1);
    const task = uploader.getUploadTask() as Upload_UploadTask;
    assert.strictEqual(task.type, UploadTaskTypes.Upload);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    assert.strictEqual(task.ping.identifier, identifier);

    // Attempt to re-enqueue the same ping by scanning the pings database,
    // since the ping has not been deleted yet this will propmt the uploader
    // to re-enqueue the ping we just created.
    await pingsDatabase.scanPendingPings();

    // No new pings should have been enqueued so the upload task is Done.
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);

    // Fake process the upload response, only the identifier really matters here
    // we expect the ping to be deleted from the queue and the database now.
    await uploader.processPingUploadResponse(
      { identifier, payload: MOCK_PAYLOAD, collectionDate:  "", path: "" },
      new UploadResult(UploadResultStatus.Success, 200)
    );

    // Check that the ping was not re-enqueued
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);

    // Check the ping was deleted from the database
    await pingsDatabase.scanPendingPings();
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);
  });
});
