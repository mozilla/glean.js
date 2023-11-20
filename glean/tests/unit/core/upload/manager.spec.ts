/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { v4 as UUIDv4 } from "uuid";

import { Configuration } from "../../../../src/core/config";
import { Context } from "../../../../src/core/context";
import PingUploadManager from "../../../../src/core/upload/manager";
import { UploadResultStatus } from "../../../../src/core/upload/uploader";
import { CounterUploader, WaitableUploader } from "../../../utils";
import PingsDatabase from "../../../../src/core/pings/database";
import { makePath } from "../../../../src/core/pings/maker";
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
   * Fills the pings database with dummy pings.
   *
   * @param numPings number of pings we want to add to the database.
   * @param pingName the name of the ping to fill the database with, defaults to "ping".
   * @returns The array of identifiers of the pings added to the database.
   */
  function fillUpPingsDatabase(
    numPings: number,
    pingName = "ping"
  ): string[] {
    const identifiers = Array.from({ length: numPings }, () => UUIDv4());
    for (const identifier of identifiers) {
      const path = makePath(
        identifier,
        { name: pingName, includeClientId: true, sendIfEmpty: true }
      );
      pingsDatabase.recordPing(path, identifier, MOCK_PAYLOAD);
    }

    return identifiers;
  }

  before(function () {
    // We call this only once so that the platform is set
    // and we are able to create a pings database.
    testResetGlean(testAppId, true);
    pingsDatabase = new PingsDatabase();
  });

  afterEach(function () {
    pingsDatabase.clearAll();
    sandbox.restore();
  });

  it("attempting to get an upload task when the queue is empty doesn't cause errors", function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    assert.doesNotThrow(() => uploader.getUploadTask());
  });

  it("attempting to get an upload task returns a upload type task when there are queued pings", function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    // Disable worker so that it is not calling `getUploadTask` in parallel.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    uploader["worker"]["work"] = () => {};

    fillUpPingsDatabase(1);

    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Upload);
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);
  });

  it("attempting to get an upload task returns as many upload type tasks as there are", function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    // Disable worker so that it is not calling `getUploadTask` in parallel.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    uploader["worker"]["work"] = () => {};

    fillUpPingsDatabase(10);

    for (let i = 0; i < 10; i++) {
      assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Upload);
    }
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);
  });

  it("rate limits the amount of upload type tasks allowed", function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    // Disable worker so that it is not calling `getUploadTask` in parallel.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    uploader["worker"]["work"] = () => {};

    fillUpPingsDatabase(MAX_PINGS_PER_INTERVAL * 2);

    for (let i = 0; i < MAX_PINGS_PER_INTERVAL; i++) {
      assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Upload);
    }
    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Wait);
  });

  it("when throttled window is complete uploading jobs can be resumed", function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);
    // Disable worker so that it is not calling `getUploadTask` in parallel.
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    uploader["worker"]["work"] = () => {};

    fillUpPingsDatabase(MAX_PINGS_PER_INTERVAL + 5);

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

  it("new pings are added to the queue and processed while upload is in process", function () {
    const httpClient = new CounterUploader();
    const uploader = new PingUploadManager(new Configuration({ httpClient }), pingsDatabase);

    fillUpPingsDatabase(10);

    // Use `enqueuePing` directly to avoid calling `worker.work` again.
    // We want to check that the ping can be enqueued and processed on the same job.
    uploader["update"]("id", {
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

    uploader.blockUploads();
    assert.strictEqual(httpClient.count, 11);
  });

  it("whenever the pings database records a new ping, upload is triggered", async function() {
    const httpClient = new WaitableUploader();
    const uploader = new PingUploadManager(new Configuration({ httpClient }), pingsDatabase);

    const uploadedPings = httpClient.waitForBatchPingSubmission("ping", 10);
    fillUpPingsDatabase(10);
    uploader.blockUploads();
    assert.strictEqual((await uploadedPings).length, 10);
  });

  it("correctly deletes pings when upload is successful", function() {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);

    // There is no need to stub the upload adapter here,
    // as the default exported mock already returns a success response always.
    fillUpPingsDatabase(10);

    uploader.blockUploads();
    assert.deepStrictEqual(Context.pingsDatabase.getAllPings(), []);
  });

  it("correctly deletes pings when upload is unrecoverably unsuccessful", function() {
    // Always return unrecoverable failure response from upload attempt.
    sandbox.stub(Context.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 400,
      result: UploadResultStatus.Success
    }));

    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);

    fillUpPingsDatabase(10);
    uploader.blockUploads();
    const allPings = Context.pingsDatabase.getAllPings();
    assert.deepStrictEqual(Object.keys(allPings).length, 0);
  });

  it("correctly re-enqueues pings when upload is recoverably unsuccessful", function() {
    // Always return recoverable failure response from upload attempt.
    sandbox.stub(Context.platform.uploader, "post").callsFake(() => Promise.resolve({
      status: 500,
      result: UploadResultStatus.Success
    }));

    fillUpPingsDatabase(1);
    // Ping should still be there.
    const allPings = Context.pingsDatabase.getAllPings();
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

  it("throttling doesn't kick in if we are right on the limit of allowed pings per interval", function () {
    const uploader = new PingUploadManager(new Configuration(), pingsDatabase);

    // Fill up the pings database right at the limit of allowed pings per interval.
    fillUpPingsDatabase(MAX_PINGS_PER_INTERVAL);

    assert.strictEqual(uploader.getUploadTask().type, UploadTaskTypes.Done);
  });
});
