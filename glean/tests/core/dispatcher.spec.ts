/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Dispatcher, { DispatcherState } from "core/dispatcher";

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

  it("clearing stops and clears the queue", async function() {
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
    assert.strictEqual(dispatcher["state"], DispatcherState.Stopped);
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
    assert.strictEqual(dispatcher["state"], DispatcherState.Stopped);
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
    assert.strictEqual(dispatcher["state"], DispatcherState.Stopped);
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

    // The clear command was launched before the testLaunch command,
    // which means it is at the top of the queue and will clear before we get to our command.
    //
    // The final expected state of the dispatcher, in this case, is stopped.
    assert.strictEqual(dispatcher["state"], DispatcherState.Stopped);
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

  it("testLaunch will reject in case the dispatcher is uninitialized for too long", async function () {
    dispatcher = new Dispatcher();
    try {
      await dispatcher.testLaunch(sampleTask);
      assert.ok(false);
    } catch {
      assert.ok(true);
    }
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

  it("testLaunch observers are unattached after promise is resolved or rejected", async function() {
    dispatcher = new Dispatcher();

    const willReject = dispatcher.testLaunch(sampleTask);
    assert.strictEqual(dispatcher["observers"].length, 1);
    try {
      await willReject;
    } catch {
      assert.strictEqual(dispatcher["observers"].length, 0);
    }

    dispatcher.flushInit();
    const willNotReject = dispatcher.testLaunch(sampleTask);
    assert.strictEqual(dispatcher["observers"].length, 1);
    await willNotReject;
    assert.strictEqual(dispatcher["observers"].length, 0);
  });
});
