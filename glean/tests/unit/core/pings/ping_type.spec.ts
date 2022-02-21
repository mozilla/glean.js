/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import PingType, { InternalPingType } from "../../../../src/core/pings/ping_type";
import CounterMetricType from "../../../../src/core/metrics/types/counter";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import Glean from "../../../../src/core/glean";
import { Context } from "../../../../src/core/context";
import { stopGleanUploader } from "../../../utils";
import type { JSONObject } from "../../../../src/core/utils";
import TestPlatform from "../../../../src/platform/test";
import { testResetGlean } from "../../../../src/core/testing";
import { testUninitializeGlean } from "../../../../src/core/testing/utils";

const sandbox = sinon.createSandbox();

/**
 * Submits a ping and waits for the dispatcher queue to be completed.
 *
 * @param ping The ping to submit.
 */
async function submitSync(ping: PingType): Promise<void> {
  ping.submit();
  // TODO: Drop this whole approach once Bug 1691033 is resolved.
  await Context.dispatcher.testBlockOnQueue();
}

describe("PingType", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  afterEach(function () {
    sandbox.restore();
  });

  beforeEach(async function() {
    await testResetGlean(testAppId);
  });

  it("collects and stores ping on submit", async function () {
    // Disable ping uploading for it not to interfere with this tests.
    stopGleanUploader();

    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    const counter = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["custom"],
      lifetime: Lifetime.Ping,
      disabled: false
    });
    counter.add();

    await submitSync(ping);
    const storedPings = await Context.pingsDatabase["store"].get() as JSONObject;
    assert.strictEqual(Object.keys(storedPings).length, 1);
  });

  it("empty pings with send if empty flag are submitted", async function () {
    // Disable ping uploading for it not to interfere with this tests.
    stopGleanUploader();

    const ping1 = new PingType({
      name: "ping1",
      includeClientId: true,
      sendIfEmpty: false,
    });
    const ping2 = new PingType({
      name: "ping2",
      includeClientId: true,
      sendIfEmpty: true,
    });

    await submitSync(ping1);
    let storedPings = await Context.pingsDatabase["store"].get();
    assert.strictEqual(storedPings, undefined);

    await submitSync(ping2);
    storedPings = await Context.pingsDatabase["store"].get() as JSONObject;
    assert.strictEqual(Object.keys(storedPings).length, 1);
  });

  it("no pings are submitted if upload is disabled", async function() {
    Glean.setUploadEnabled(false);

    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    await submitSync(ping);
    const storedPings = await Context.pingsDatabase["store"].get();
    assert.strictEqual(storedPings, undefined);
  });

  it("no pings are submitted if Glean has not been initialized", async function() {
    await testUninitializeGlean();

    const spy = sandbox.spy(TestPlatform.uploader, "post");
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    await submitSync(ping);

    assert.ok(!spy.calledOnce);
  });

  it("runs a validator with no metrics tests", async function() {
    // Need to use the internal type here in order to access the test promise related props.
    const ping = new InternalPingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
      reasonCodes: ["test"]
    });

    // We did not call the testing API yet, internals should be undefined.
    assert.strictEqual(ping["resolveTestPromiseFunction"], undefined);
    assert.strictEqual(ping["rejectTestPromiseFunction"], undefined);
    assert.strictEqual(ping["testCallback"], undefined);

    let validatorRun = false;
    const p = ping.testBeforeNextSubmit(r => {
      assert.strictEqual(r, "test");
      validatorRun = true;
      return Promise.resolve();
    });

    // Internals should be defined after the API was called.
    assert.notStrictEqual(ping["resolveTestPromiseFunction"], undefined);
    assert.notStrictEqual(ping["rejectTestPromiseFunction"], undefined);
    assert.notStrictEqual(ping["testCallback"], undefined);

    ping.submit("test");
    await p;

    assert.ok(validatorRun);
  });

  it("runs a validator with metrics tests", async function() {
    const TEST_VALUE = 2908;

    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
      reasonCodes: ["test"]
    });
    const counter = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["custom"],
      lifetime: Lifetime.Ping,
      disabled: false
    });
    counter.add(TEST_VALUE);

    let validatorRun = false;
    const p = ping.testBeforeNextSubmit(async r => {
      assert.strictEqual(r, "test");
      assert.strictEqual(await counter.testGetValue(), TEST_VALUE);
      validatorRun = true;
    });

    ping.submit("test");
    await p;

    assert.ok(validatorRun);
  });

  it("runs a validator multiple times on the same ping", async function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
      reasonCodes: ["test1", "test2"]
    });
    const counter = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["custom"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    for (let i = 1; i < 3; i++) {
      counter.add(i);

      let validatorRun = false;
      const testPromise = ping.testBeforeNextSubmit(async r => {
        assert.strictEqual(r, `test${i}`);
        assert.strictEqual(await counter.testGetValue(), i);
        validatorRun = true;
      });

      await new Promise(r => setTimeout(r, 100));

      ping.submit(`test${i}`);
      await testPromise;

      assert.ok(validatorRun);
    }
  });

  it("running a validator multiple times fails when not awaiting", function() {
    // Need to use the internal type here in order to access the test promise related props.
    const ping = new InternalPingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false
    });

    assert.strictEqual(ping["testCallback"], undefined);

    const testFunction = async () => Promise.resolve();
    void ping.testBeforeNextSubmit(testFunction);
    assert.strictEqual(ping["testCallback"], testFunction);

    void ping.testBeforeNextSubmit(() => Promise.resolve());
    assert.strictEqual(ping["testCallback"], testFunction);
  });

  it("runs a validator that rejects", async function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false
    });

    // eslint-disable-next-line @typescript-eslint/require-await
    const p = ping.testBeforeNextSubmit(async () => {
      throw new Error("This should reject!");
    });

    ping.submit();

    await assert.rejects(p);
  });

  // The following test showcases the shortcomings of the current implementation
  // of the Ping testing API. It's disabled as it fails with the current implementation,
  // but it's left there for future reference.
  it.skip("the validator is not affected by recordings after submit", async function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
      reasonCodes: ["test"]
    });

    const counter = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["custom"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    let validatorRun = false;
    const TEST_NUM_ADDITIONS = 100;

    const p = ping.testBeforeNextSubmit(async () => {
      // The timeout is here to make the test fail more
      // reliably with the current implementation.
      await new Promise(r => setTimeout(r, 100));

      const value = await counter.testGetValue();
      // We don't expect any value to be stored, because the
      // calls to 'add' happen after the ping submission.
      assert.strictEqual(value, undefined);
      validatorRun = true;
    });
    ping.submit("test");

    for (let i = 0; i < TEST_NUM_ADDITIONS; i++) {
      counter.add();
    }

    await p;

    assert.ok(validatorRun);
  });


  // The following test showcases the shortcomings of the current implementation
  // of the Ping testing API. It's disabled as it fails with the current implementation,
  // but it's left there for future reference.
  it.skip("the validator real test", async function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
      reasonCodes: ["test"]
    });

    const delayedCounter = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["custom"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const canary = new CounterMetricType({
      category: "aCategory",
      name: "canary",
      sendInPings: ["custom"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    let validatorRun = false;
    const TEST_NUM_ADDITIONS = 100;

    const p = ping.testBeforeNextSubmit(async () => {
      await new Promise(r => setTimeout(r, 100));

      assert.strictEqual(await canary.testGetValue(), 37, "Canary must match");
      const value = await delayedCounter.testGetValue();
      assert.strictEqual(value, undefined);
      validatorRun = true;
    });

    const testFunc = () => {
      canary.add(37);
      ping.submit("test");
    };

    testFunc();

    await p;
    for (let i = 0; i < TEST_NUM_ADDITIONS; i++) {
      delayedCounter.add();
    }

    assert.ok(validatorRun);
  });
});
