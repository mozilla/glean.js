/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import { UploadTaskTypes } from "../../../../src/core/upload/task";
import type { UploadTask } from "../../../../src/core/upload/task";
import uploadTaskFactory from "../../../../src/core/upload/task";
import PingUploadWorker from "../../../../src/core/upload/worker";
import TestPlatform from "../../../../src/platform/test";
import Glean from "../../../../src/core/glean";
import { CounterUploader } from "../../../utils";
import { makePath } from "../../../../src/core/pings/maker";
import { Context } from "../../../../src/core/context";
import Policy from "../../../../src/core/upload/policy";
import { UploadResultStatus } from "../../../../src/core/upload/uploader";
import type { UploadResult } from "../../../../src/core/upload/uploader";

const sandbox = sinon.createSandbox();

const MOCK_PING_NAME = "ping";
const MOCK_PING_IDENTIFIER = "identifier";

/**
 * Build mock upload task of a given type.
 *
 * @param type The type of the task to build.
 * @returns An upload task.
 */
function buildMockTask(type: UploadTaskTypes): UploadTask {
  switch(type) {
  case UploadTaskTypes.Done:
    return uploadTaskFactory.done();
  case UploadTaskTypes.Wait:
    return uploadTaskFactory.wait(10);
  case UploadTaskTypes.Upload:
    return uploadTaskFactory.upload({
      identifier: MOCK_PING_IDENTIFIER,
      collectionDate: "2021-11-23T17:23:31.661Z",
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
      path: makePath(
        MOCK_PING_IDENTIFIER,
        { name: MOCK_PING_NAME, includeClientId: true, sendIfEmpty: true }
      )
    });
  }
}

/**
 * Generator that yields mock tasks of given types in given order.
 *
 * @param tasks The tasks to yield.
 * @yields A task.
 * @returns The last task is not yielded, it's returned.
 */
function* mockGetUploadTasks(tasks: UploadTaskTypes[]): Generator<UploadTask, UploadTask> {
  let index = 0;
  while(index < tasks.length - 1) {
    yield buildMockTask(tasks[index]);
    index++;
  }

  return buildMockTask(tasks[index]);
}

describe("PingUploadWorker", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  before(async function () {
    // We call this only once so that the platform is set
    // and we are able to access the Platform info.
    await Glean.testResetGlean(testAppId, true);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("whenever a Done task is received the currentJob is ended", async function() {
    const uploader = new CounterUploader();
    const worker = new PingUploadWorker(uploader, "https://my-glean-test.com");
    const tasksGenerator = mockGetUploadTasks([
      UploadTaskTypes.Done,
      UploadTaskTypes.Upload,
      // Always end with a Done task to make sure the worker stops asking for more tasks.
      UploadTaskTypes.Done
    ]);

    worker.work(
      () => tasksGenerator.next().value,
      () => Promise.resolve()
    );
    const firstJob = worker["currentJob"];

    await worker.blockOnCurrentJob();
    // Check that we never got to the Upload task enqueued,
    // due to bailing out when we found a Done task.
    assert.strictEqual(uploader.count, 0);

    // Check worker can be resumed after.
    worker.work(
      () => tasksGenerator.next().value,
      () => Promise.resolve()
    );
    const secondJob = worker["currentJob"];

    await worker.blockOnCurrentJob();
    assert.strictEqual(uploader.count, 1);

    // The first job is different from the second job.
    // Meaning: the first job was finished when we blocked.
    assert.notStrictEqual(firstJob, secondJob);
  });

  it("whenever a Wait task is received the currentJob is ended", async function() {
    const worker = new PingUploadWorker(TestPlatform.uploader, "https://my-glean-test.com");
    const tasksGenerator = mockGetUploadTasks([ UploadTaskTypes.Wait, UploadTaskTypes.Upload ]);

    worker.work(
      () => tasksGenerator.next().value,
      () => Promise.resolve()
    );

    await worker.blockOnCurrentJob();
    // Check that we never got to the Upload task enqueued,
    // due to bailing out when we found a Wait task.
    assert.strictEqual(tasksGenerator.next().value.type, UploadTaskTypes.Upload);
  });

  it("whenever an Upload task is received upload attempts are made", async function() {
    const uploader = new CounterUploader();
    const worker = new PingUploadWorker(uploader, "https://my-glean-test.com");
    const tasksGenerator = mockGetUploadTasks([
      ...Array(10).fill(UploadTaskTypes.Upload) as UploadTaskTypes.Upload[],
      // Always end with a Done task to make sure the worker stops asking for more tasks.
      UploadTaskTypes.Done
    ]);

    worker.work(
      () => tasksGenerator.next().value,
      () => Promise.resolve()
    );

    await worker.blockOnCurrentJob();
    // All upload requests were completed.
    assert.strictEqual(uploader.count, 10);
  });

  it("ping requests are built correctly", async function () {
    const postSpy = sandbox.spy(TestPlatform.uploader, "post");

    const worker = new PingUploadWorker(TestPlatform.uploader, "https://my-glean-test.com");
    const tasksGenerator = mockGetUploadTasks([
      UploadTaskTypes.Upload,
      // Always end with a Done task to make sure the worker stops asking for more tasks.
      UploadTaskTypes.Done
    ]);

    worker.work(
      () => tasksGenerator.next().value,
      () => Promise.resolve()
    );
    await worker.blockOnCurrentJob();

    const url = postSpy.firstCall.args[0].split("/");
    const appId = url[url.length - 4];
    const documentId = url[url.length - 1];
    const headers = postSpy.firstCall.args[2] || {};

    assert.strictEqual(documentId, MOCK_PING_IDENTIFIER);
    assert.strictEqual(appId, Context.applicationId);

    assert.ok("Date" in headers);
    assert.ok("Content-Length" in headers);
    assert.ok("Content-Type" in headers);
    assert.ok("X-Client-Type" in headers);
    assert.ok("X-Client-Version" in headers);
    assert.ok("X-Telemetry-Agent" in headers);
    assert.strictEqual(headers["Content-Encoding"], "gzip");
  });

  it("succesfull upload attemps return the correct upload result", async function () {
    const postSpy = sandbox.stub(TestPlatform.uploader, "post")
      .onFirstCall().callsFake(() => Promise.resolve({
        status: 200,
        result: UploadResultStatus.Success
      }))
      .onSecondCall().callsFake(() => Promise.resolve({
        status: 404,
        result: UploadResultStatus.Success
      }))
      .onThirdCall().callsFake(() => Promise.resolve({
        status: 500,
        result: UploadResultStatus.Success
      }));

    const worker = new PingUploadWorker(TestPlatform.uploader, "https://my-glean-test.com");
    const tasksGenerator = mockGetUploadTasks([
      UploadTaskTypes.Upload,
      UploadTaskTypes.Upload,
      UploadTaskTypes.Upload,
      // Always end with a Done task to make sure the worker stops asking for more tasks.
      UploadTaskTypes.Done
    ]);

    const processSpy = sandbox.spy();
    worker.work(
      () => tasksGenerator.next().value,
      processSpy
    );
    await worker.blockOnCurrentJob();

    assert.strictEqual(postSpy.callCount, 3);

    const resultSuccess = (processSpy.firstCall.args as [never, UploadResult])[1];
    assert.strictEqual(resultSuccess.result, UploadResultStatus.Success);
    assert.strictEqual(resultSuccess.status, 200);

    const resultNotFound = (processSpy.secondCall.args as [never, UploadResult])[1];
    assert.strictEqual(resultNotFound.result, UploadResultStatus.Success);
    assert.strictEqual(resultNotFound.status, 404);

    const resultInternalServerError = (processSpy.thirdCall.args as [never, UploadResult])[1];
    assert.strictEqual(resultInternalServerError.result, UploadResultStatus.Success);
    assert.strictEqual(resultInternalServerError.status, 500);
  });

  it("pings which exceed max ping body size are not sent and a correct result is returned", async function () {
    const uploader = new CounterUploader();
    // Create a new worker with a very low max ping body size,
    // so that virtually any ping body will throw an error.
    const worker = new PingUploadWorker(
      uploader,
      "https://my-glean-test.com",
      new Policy(
        3, // maxWaitAttempts
        3, // maxRecoverableFailures
        1, // maxPingBodySize
      )
    );
    const tasksGenerator = mockGetUploadTasks([
      UploadTaskTypes.Upload,
      // Always end with a Done task to make sure the worker stops asking for more tasks.
      UploadTaskTypes.Done
    ]);

    const processSpy = sandbox.spy();
    worker.work(
      () => tasksGenerator.next().value,
      processSpy
    );
    await worker.blockOnCurrentJob();

    // Check that none of those pings were actually sent.
    assert.strictEqual(uploader.count, 0);
    // Check that an UnrecoverableFailure was returned by the upload attempt.
    const uploadResult = (processSpy.firstCall.args as [never, UploadResult])[1];
    assert.strictEqual(uploadResult.result, UploadResultStatus.UnrecoverableFailure);
  });

  it("attempting to start a new job when another is ongoing is a no-op", async function() {
    const worker = new PingUploadWorker(TestPlatform.uploader, "https://my-glean-test.com");
    const tasksGenerator = mockGetUploadTasks([
      ...Array(10).fill(UploadTaskTypes.Upload) as UploadTaskTypes.Upload[],
      // Always end with a Done task to make sure the worker stops asking for more tasks.
      UploadTaskTypes.Done
    ]);

    worker.work(
      () => tasksGenerator.next().value,
      () => Promise.resolve()
    );

    const initialCurrentJob = worker["currentJob"];

    worker.work(
      () => tasksGenerator.next().value,
      () => Promise.resolve()
    );

    assert.strictEqual(worker["currentJob"], initialCurrentJob);

    // Wait for the queue to be processed before exiting the test.
    await worker.blockOnCurrentJob();
  });
});
