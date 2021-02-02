/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Dispatcher, { DispatcherState } from "dispatcher";

const sandbox = sinon.createSandbox();

/**
 * A sample task which returns a promise that takes between 0 and 10 ms to resolve.
 *
 * @returns The promise resolved when the timeout expires.
 */
const sampleTask = (): Promise<void> => {
  return new Promise(resolve => setTimeout(() => {
    resolve(undefined);
  }, Math.random() * 10));
};

let dispatcher: Dispatcher;
describe("Dispatcher", function() {
  afterEach(async function () {
    sandbox.restore();
    dispatcher && await dispatcher.testBlockOnQueue();
  });

  it("launch correctly adds tasks to the queue", async function () {
    dispatcher = new Dispatcher();
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(sampleTask);
    }

    assert.strictEqual(dispatcher["queue"].length, 10);
  });

  it("when tasks are launched executing is triggered as expected", async function () {
    dispatcher = new Dispatcher();
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(sampleTask);
    }

    assert.strictEqual(dispatcher["queue"].length, 10);
    dispatcher.flushInit();
    await dispatcher.testBlockOnQueue();
    assert.strictEqual(dispatcher["queue"].length, 0);

    const stub = sinon.stub().callsFake(sampleTask);
    dispatcher.launch(stub);
    await dispatcher.testBlockOnQueue();
    assert.strictEqual(stub.callCount, 1);
    assert.strictEqual(dispatcher["queue"].length, 0);
  });

  it("new tasks are added to the queue while executing of previous tasks is ongoing", async function () {
    dispatcher = new Dispatcher();
    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(sampleTask);
    }

    dispatcher.flushInit();
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    await dispatcher.testBlockOnQueue();
    assert.strictEqual(stub.callCount, 10);
    assert.strictEqual(dispatcher["queue"].length, 0);
  });

  it("queued tasks are executed in the order they are received", async function() {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    let counter = 0;
    const counts = new Array(10).fill(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stubs: sinon.SinonStub<any[], any>[] = [];
    for (let i = 0; i < 10; i++) {
      stubs.push(sandbox.stub().callsFake(async (): Promise<void> => {
        counts[i] = counter;
        counter++;
      }));
    }

    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stubs[i]);
    }

    await dispatcher.testBlockOnQueue();
    for (let i = 0; i < 10; i++) {
      assert.strictEqual(counts[i], i);
    }
  });

  it("each queued task is only executed once", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stubs: sinon.SinonStub<any[], any>[] = [];
    for (let i = 0; i < 10; i++) {
      stubs.push(sandbox.stub().callsFake(sampleTask));
      dispatcher.launch(stubs[i]);
    }

    await dispatcher.testBlockOnQueue();
    for (let i = 0; i < 10; i++) {
      assert.strictEqual(stubs[i].callCount, 1);
    }
  });

  it("exceptions thrown by enqueued tasks are caught", async function () {
    dispatcher = new Dispatcher();
    const stub = sandbox.stub().callsFake(() => Promise.reject());
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    dispatcher.flushInit();
    assert.doesNotThrow(async () => await dispatcher.testBlockOnQueue());
  });

  it("queue is bounded before flushInit", async function () {
    dispatcher = new Dispatcher(5);
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(sampleTask);
    }

    assert.strictEqual(dispatcher["queue"].length, 5);
  });

  it("queue is unbounded after calling flushInit once", async function () {
    dispatcher = new Dispatcher(5);
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    await dispatcher.testBlockOnQueue();
    assert.strictEqual(stub.callCount, 10);
  });

  it("clearing stops and clears the queue", async function() {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 100; i++) {
      dispatcher.launch(stub);
    }

    await dispatcher.clear();
    assert.ok(stub.callCount < 10);
    assert.strictEqual(dispatcher["queue"].length, 0);
  });

  it("stopping stops execution of tasks, even though tasks are still enqueued", async function() {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 100; i++) {
      dispatcher.launch(stub);
    }

    await dispatcher.stop();

    assert.ok(stub.callCount < 10);
    assert.strictEqual(dispatcher["queue"].length, 100 - stub.callCount);
    assert.strictEqual(dispatcher["state"], DispatcherState.Stopped);
  });

  it("executing tasks in sync mode works as expected", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();
    await dispatcher.testBlockOnQueue();

    const stubAsync = sandbox.stub().callsFake(sampleTask);
    // Async start a bunch of tasks, so that this tests resembles more closely the real world.
    for (let i = 0; i < 100; i++) {
      setTimeout(() => {
        dispatcher.launch(stubAsync);
      }, Math.random() * 100);
    }

    // While the above tasks are being enqueued, attempt to run a block of sync tasks.
    const stubSync = sandbox.stub().callsFake(sampleTask);
    await dispatcher.executeSynchronously(() => {
      for (let i = 0; i < 100; i++) {
        dispatcher.launch(stubSync);
      }
    });

    // The async tasks  have not even finished being enqueued
    assert.strictEqual(stubSync.callCount, 100);

    // Wait for async tasks to be completed.
    await dispatcher.testBlockOnQueue();
    assert.strictEqual(stubAsync.callCount, 100);
  });

  it("calling executeSync inside a dispatched task works", async function() {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();
    await dispatcher.testBlockOnQueue();

    const stubSync = sandbox.stub().callsFake(sampleTask);
    let executeSyncWorked = false;
    const task = async () => {
      await dispatcher.executeSynchronously(() => {
        for (let i = 0; i < 100; i++) {
          dispatcher.launch(stubSync);
        }
      });

      if (stubSync.callCount === 100) {
        executeSyncWorked = true;
      }
    };

    dispatcher.launch(task);
    await dispatcher.testBlockOnQueue();
    assert.ok(executeSyncWorked);
  });
});
