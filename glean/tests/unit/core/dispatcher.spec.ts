/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Dispatcher, { DispatcherState } from "../../../src/core/dispatcher";

const sandbox = sinon.createSandbox();

/**
 * A sample task which returns a promise that takes between 0 and 10 ms to resolve.
 *
 * @returns The promise resolved when the timeout expires.
 */
const sampleTask = (): Promise<void> => {
  return new Promise<void>(resolve => setTimeout(() => {
    resolve();
  }, Math.random() * 10));
};

let dispatcher: Dispatcher;
describe("Dispatcher", function() {
  afterEach(async function () {
    sandbox.restore();
    dispatcher && await dispatcher.testBlockOnQueue();
  });

  it("launch correctly adds tasks to the queue", function () {
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
      stubs.push(sandbox.stub().callsFake((): Promise<void> => {
        counts[i] = counter;
        counter++;
        return Promise.resolve();
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

  it("exceptions thrown by enqueued tasks are caught", function () {
    dispatcher = new Dispatcher();
    const stub = sandbox.stub().callsFake(() => Promise.reject());
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    dispatcher.flushInit();
    assert.doesNotThrow(async () => await dispatcher.testBlockOnQueue());
  });

  it("queue is bounded before flushInit", function () {
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

  it("dispatcher just keeps enqueueing tasks launched inside other tasks", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);
    const inceptionTask = async () => {
      await stub();
      dispatcher.launch(async () => {
        await stub();
        dispatcher.launch(stub);
      });
    };

    const originalExecuteFn = dispatcher["execute"].bind(dispatcher);
    let executeCallCount = 0;
    dispatcher["execute"] = async (): Promise<void> => {
      await originalExecuteFn();
      executeCallCount++;
    };
    dispatcher.launch(inceptionTask);

    await dispatcher.testBlockOnQueue();
    assert.strictEqual(stub.callCount, 3);

    // Execute should only have been called once.
    //
    // The dispatcher should be never have left the Processing state
    // while launching the internal tasks.
    assert.strictEqual(executeCallCount, 1);
  });

  it("clears the queue and return the dispatcher to an Idle state", async function() {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 100; i++) {
      dispatcher.launch(stub);
    }

    dispatcher.clear();
    await dispatcher.testBlockOnQueue();

    assert.ok(stub.callCount < 10);
    assert.strictEqual(dispatcher["queue"].length, 0);
    assert.strictEqual(dispatcher["state"], DispatcherState.Idle);
  });

  it("clearing works even if the dispatcher is stopped", async function() {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();
    dispatcher.stop();

    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    assert.strictEqual(stub.callCount, 0);
    assert.strictEqual(dispatcher["queue"].length, 10);

    dispatcher.clear();
    await dispatcher.testBlockOnQueue();

    assert.strictEqual(stub.callCount, 0);
    assert.strictEqual(dispatcher["queue"].length, 0);
    assert.strictEqual(dispatcher["state"], DispatcherState.Idle);
  });

  it("clear does not clear persistent tasks", async function() {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();
    dispatcher.stop();

    // Launch a bunch of ordinary tasks.
    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    // Launch one persistent task.
    const persistentStub = sandbox.stub().callsFake(sampleTask);
    dispatcher.launchPersistent(persistentStub);

    assert.strictEqual(stub.callCount, 0);
    assert.strictEqual(dispatcher["queue"].length, 11);

    dispatcher.clear();
    await dispatcher.testBlockOnQueue();

    // Check that only the persistent task was executed.
    assert.strictEqual(stub.callCount, 0);
    assert.strictEqual(persistentStub.callCount, 1);
  });

  it("clear does not clear shutdown tasks", async function() {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    // Launch a bunch of ordinary tasks.
    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    // Do not block on shutdown just yet.
    const waitForShutdown = dispatcher.shutdown();

    // Call the clear command _after_ shutdown to be sure
    // it is enqueued while shutdown is in the queue.
    dispatcher.clear();

    // Now wait for shutdown, this will wait for all tasks in the queue to be executed.
    await waitForShutdown;

    // Check that the clear command did clear the usual tasks it should have
    // i.e. that shutdown actually did not wait for all of them to be executed.
    assert.ok(stub.callCount < 10);

    // Check that the dispatcher was shut down.
    assert.strictEqual(dispatcher["state"], DispatcherState.Shutdown);
  });

  it("attempting to clear from inside a launched task finishes the current task before clearing", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    dispatcher.launch(() => Promise.resolve(dispatcher.clear()));
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }
    await dispatcher.testBlockOnQueue();

    assert.strictEqual(stub.callCount, 10);
    assert.strictEqual(dispatcher["queue"].length, 0);
    assert.strictEqual(dispatcher["state"], DispatcherState.Idle);
  });

  it("stopping stops execution of tasks, even though tasks are still enqueued", async function() {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 100; i++) {
      dispatcher.launch(stub);
    }

    dispatcher.stop();
    await dispatcher.testBlockOnQueue();

    assert.ok(stub.callCount < 10);
    assert.strictEqual(dispatcher["queue"].length, 100 - stub.callCount);
  });

  it("attempting to stop execution from inside a launched task finishes the current task before stopping", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    dispatcher.launch(() => Promise.resolve(dispatcher.stop()));
    await dispatcher.testBlockOnQueue();

    assert.strictEqual(stub.callCount, 10);
    assert.strictEqual(dispatcher["state"], DispatcherState.Stopped);
  });

  it("testLaunch will resolve once the task is executed", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);

    // Launch a bunch of tasks to clog the queue
    for (let i = 0; i < 100; i++) {
      dispatcher.launch(sampleTask);
    }

    await dispatcher.testLaunch(stub);

    assert.strictEqual(stub.callCount, 1);
  });

  it("testLaunch will also resolve if the queue is cleared", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub = sandbox.stub().callsFake(sampleTask);

    // Launch a bunch of tasks to clog the queue
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(sampleTask);
    }

    // The clear command will be queued before `testLaunch`
    // and that will definitely prevent `testLaunch` from being called.
    dispatcher.clear();
    await dispatcher.testLaunch(stub);

    assert.strictEqual(stub.callCount, 0);
  });

  it("testLaunch will resume queue execution if the dispatcher is stopped", async function () {
    dispatcher = new Dispatcher();

    const stub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(stub);
    }

    dispatcher.stop();

    dispatcher.flushInit();
    await dispatcher.testBlockOnQueue();
    assert.strictEqual(dispatcher["queue"].length, 10);

    const testStub = sandbox.stub().callsFake(sampleTask);
    await dispatcher.testLaunch(testStub);

    assert.strictEqual(dispatcher["queue"].length, 0);
    assert.strictEqual(stub.callCount, 10);
    assert.strictEqual(testStub.callCount, 1);

    // We block here because we are only sure that all the tasks are done executing.
    // We are not _guaranteed_ that the `execute` function is done,
    // this the state may still be Processing.
    await dispatcher.testBlockOnQueue();

    // If the dispatcher was stopped and we called `testLaunch`
    // the dispatcher will return the dispatcher to an idle state.
    assert.strictEqual(dispatcher["state"], DispatcherState.Idle);
  });

  it("testLaunch will not reject in case the dispatcher is uninitialized, but quickly initializes", async function () {
    dispatcher = new Dispatcher();
    const testLaunchedTask = dispatcher.testLaunch(sampleTask);
    dispatcher.flushInit();
    try {
      await testLaunchedTask;
      assert.ok(true);
    } catch {
      assert.ok(false);
    }
  });

  it("launching multiple test tasks at the same time works as expected", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const stub1 = sandbox.stub().callsFake(sampleTask);
    const stub2 = sandbox.stub().callsFake(sampleTask);
    const stub3 = sandbox.stub().callsFake(sampleTask);

    const test1 = dispatcher.testLaunch(stub1);
    const test2 = dispatcher.testLaunch(stub2);
    const test3 = dispatcher.testLaunch(stub3);

    await Promise.all([test1, test2, test3]);

    sinon.assert.callOrder(stub1, stub2, stub3);
  });

  it("shutdown executes all previous tasks before shutting down", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    let executionCounter = 0;
    const counterTask = (): Promise<void> => {
      executionCounter++;
      return Promise.resolve();
    };

    for (let i = 0; i < 10; i++) {
      dispatcher.launch(counterTask);
    }

    await dispatcher.shutdown();
    assert.strictEqual(executionCounter, 10);

    // Attempting to enqueue new tasks after shutdown is no-op.
    for (let i = 0; i < 10; i++) {
      dispatcher.launch(counterTask);
    }
    assert.strictEqual(executionCounter, 10);
  });

  it("shutdown executes all pending tasks even if the dispatcher is stopped", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();
    dispatcher.stop();

    let executionCounter = 0;
    const counterTask = (): Promise<void> => {
      executionCounter++;
      return Promise.resolve();
    };

    for (let i = 0; i < 10; i++) {
      dispatcher.launch(counterTask);
    }

    // Before shutdown nothing has been executed yet.
    assert.strictEqual(executionCounter, 0);

    // After shutdown all previosu tasks are executed.
    await dispatcher.shutdown();
    assert.strictEqual(executionCounter, 10);
  });

  it("persistent or otherwise, all tasks launched after shutdown are cleared", async function () {
    dispatcher = new Dispatcher();
    dispatcher.flushInit();

    const preShutdownStub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 5; i++) {
      dispatcher.launch(preShutdownStub);
      dispatcher.launchPersistent(preShutdownStub);
    }

    // Don't await on shutdown just yet, let's enqueued some tasks after we call it.
    const shutdownPromise = dispatcher.shutdown();

    // Launch a bunch of persistent tasks after shutdown
    const postShutdownStub = sandbox.stub().callsFake(sampleTask);
    for (let i = 0; i < 5; i++) {
      dispatcher.launch(postShutdownStub);
      dispatcher.launchPersistent(postShutdownStub);
    }

    // Now wait for shutdown.
    await shutdownPromise;

    // Check that only preShutdown tasks were executed.
    assert.strictEqual(preShutdownStub.callCount, 10);
    assert.strictEqual(postShutdownStub.callCount, 0);
  });
});
