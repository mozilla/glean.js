/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import { CLIENT_INFO_STORAGE, DELETION_REQUEST_PING_NAME, KNOWN_CLIENT_ID } from "../../../src/core/constants";
import CoreEvents from "../../../src/core/events";
import Glean from "../../../src/core/glean";
import StringMetricType from "../../../src/core/metrics/types/string";
import CounterMetricType from "../../../src/core/metrics/types/counter";
import PingType from "../../../src/core/pings/ping_type";
import type { JSONObject } from "../../../src/core/utils";
import { isObject } from "../../../src/core/utils";
import { stopGleanUploader, WaitableUploader } from "../../../tests/utils";
import TestPlatform from "../../../src/platform/test";
import Plugin from "../../../src/plugins";
import { Lifetime } from "../../../src/core/metrics/lifetime";
import { Context } from "../../../src/core/context";
import EventMetricType from "../../../src/core/metrics/types/event";
import { getGleanRestartedEventMetric } from "../../../src/core/metrics/events_database";
import { testInitializeGlean, testUninitializeGlean } from "../../../src/core/testing/utils";
import { testResetGlean } from "../../../src/core/testing";

class MockPlugin extends Plugin<typeof CoreEvents["afterPingCollection"]> {
  constructor() {
    super(CoreEvents["afterPingCollection"].name, "mockPlugin");
  }

  action(): Promise<JSONObject> {
    return Promise.resolve({});
  }
}

const sandbox = sinon.createSandbox();

describe("Glean", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("client_id and first_run_date are regenerated if cleared", async function() {
    await Context.metricsDatabase.clearAll();
    assert.strictEqual(
      await Glean.coreMetrics["clientId"].testGetValue(CLIENT_INFO_STORAGE), undefined);
    assert.strictEqual(
      await Glean.coreMetrics["firstRunDate"].testGetValue(CLIENT_INFO_STORAGE), undefined);

    await testUninitializeGlean();
    await testInitializeGlean(testAppId, true);
    assert.ok(await Glean.coreMetrics["clientId"].testGetValue(CLIENT_INFO_STORAGE));
    assert.ok(await Glean.coreMetrics["firstRunDate"].testGetValue(CLIENT_INFO_STORAGE));
  });

  it("basic metrics should be cleared when upload is disabled", async function() {
    const pings = ["aPing", "twoPing", "threePing"];
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: pings,
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), "TEST VALUE");
    }

    Glean.setUploadEnabled(false);
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), undefined);
    }

    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), undefined);
    }

    Glean.setUploadEnabled(true);
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), undefined);
    }

    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), "TEST VALUE");
    }
  });

  it("first_run_date is managed correctly when toggling uploading", async function() {
    const originalFirstRunDate = await Glean.coreMetrics["firstRunDate"]
      .testGetValueAsString(CLIENT_INFO_STORAGE);

    Glean.setUploadEnabled(false);
    assert.strictEqual(
      await Glean.coreMetrics["firstRunDate"].testGetValueAsString(CLIENT_INFO_STORAGE),
      originalFirstRunDate
    );

    Glean.setUploadEnabled(true);
    assert.strictEqual(
      await Glean.coreMetrics["firstRunDate"].testGetValueAsString(CLIENT_INFO_STORAGE),
      originalFirstRunDate
    );
  });

  it("client_id is managed correctly when toggling uploading", async function() {
    const originalClientId = await Glean.coreMetrics["clientId"]
      .testGetValue(CLIENT_INFO_STORAGE);
    assert.ok(originalClientId);
    assert.ok(originalClientId !== KNOWN_CLIENT_ID);

    Glean.setUploadEnabled(false);
    assert.strictEqual(
      await Glean.coreMetrics["clientId"].testGetValue(CLIENT_INFO_STORAGE),
      KNOWN_CLIENT_ID
    );

    Glean.setUploadEnabled(true);
    const newClientId = await Glean.coreMetrics["clientId"].testGetValue(CLIENT_INFO_STORAGE);
    assert.ok(newClientId !== originalClientId);
    assert.ok(newClientId !== KNOWN_CLIENT_ID);
  });

  it("client_id is set to known value when uploading disabled at start", async function() {
    await testUninitializeGlean();
    await testInitializeGlean(testAppId, false);
    assert.strictEqual(
      await Glean.coreMetrics["clientId"].testGetValue(CLIENT_INFO_STORAGE),
      KNOWN_CLIENT_ID
    );
  });

  it("client_id is set to random value when uploading enabled at start", async function() {
    Glean.setUploadEnabled(false);
    await testUninitializeGlean();
    await testInitializeGlean(testAppId, true);
    const clientId = await Glean.coreMetrics["clientId"]
      .testGetValue(CLIENT_INFO_STORAGE);
    assert.ok(clientId);
    assert.ok(clientId !== KNOWN_CLIENT_ID);
  });

  it("enabling when already enabled is a no-op", async function() {
    const spy = sandbox.spy(Glean.coreMetrics, "initialize");
    Glean.setUploadEnabled(true);
    // Wait for `setUploadEnabled` to be executed.
    await Context.dispatcher.testBlockOnQueue();
    assert.strictEqual(spy.callCount, 0);
  });

  it("disabling when already disabled is a no-op", async function() {
    const spy = sandbox.spy(Glean.pingUploader, "clearPendingPingsQueue");
    Glean.setUploadEnabled(false);
    Glean.setUploadEnabled(false);
    // Wait for `setUploadEnabled` to be executed both times.
    await Context.dispatcher.testBlockOnQueue();
    assert.strictEqual(spy.callCount, 1);
  });

  it("attempting to change upload status prior to initialize is a no-op", async function() {
    await testUninitializeGlean();

    const launchSpy = sandbox.spy(Context.dispatcher, "launch");
    Glean.setUploadEnabled(false);
    assert.strictEqual(launchSpy.callCount, 0);
  });

  it("initialization throws if applicationId is an empty string", async function() {
    await testUninitializeGlean();
    try {
      await testInitializeGlean("", true);
      assert.ok(false);
    } catch {
      assert.ok(true);
    }
  });

  it("initialization throws if serverEndpoint is an invalida URL", async function() {
    await testUninitializeGlean();
    try {
      await testInitializeGlean(testAppId, true, { serverEndpoint: "" });
      assert.ok(false);
    } catch {
      assert.ok(true);
    }
  });

  it("initialization registers plugins when provided", async function() {
    await testUninitializeGlean();

    const mockPlugin = new MockPlugin();
    await testInitializeGlean(testAppId, true, {
      // We need to ignore TypeScript here,
      // otherwise it will error since mockEvent is not listed as a Glean event in core/events.ts
      //
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      plugins: [ mockPlugin ]
    });

    assert.deepStrictEqual(CoreEvents["afterPingCollection"]["plugin"], mockPlugin);

    await testUninitializeGlean();
    await testInitializeGlean(testAppId, true);
    assert.strictEqual(CoreEvents["afterPingCollection"]["plugin"], undefined);
  });

  it("disabling upload should disable metrics recording", async function() {
    const pings = ["aPing", "twoPing", "threePing"];
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: pings,
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), "TEST VALUE");
    }

    Glean.setUploadEnabled(false);
    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), undefined);
    }
  });

  it("initializing twice is a no-op", async function() {
    await testUninitializeGlean();
    await testInitializeGlean(testAppId, true);
    // initialize is dispatched, we must await on the queue being completed to assert things.
    await Context.dispatcher.testBlockOnQueue();

    // This time it should not be called, which means upload should not be switched to `false`.
    await testInitializeGlean(testAppId, false);
    assert.ok(Context.uploadEnabled);
  });

  it("flipping upload enabled respects order of events", async function() {
    await testUninitializeGlean();

    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: true,
    });
    const mockUploader = new WaitableUploader();
    const pingBody = mockUploader.waitForPingSubmission(DELETION_REQUEST_PING_NAME);

    // Start Glean with upload enabled.
    await testInitializeGlean(
      testAppId,
      true,
      {
        httpClient: mockUploader,
      });
    // Immediatelly disable upload.
    Glean.setUploadEnabled(false);
    ping.submit();

    await Context.dispatcher.testBlockOnQueue();
    await pingBody;
  });

  it("deletion request is sent when toggling upload from on to off", async function() {
    // Un-initialize, but don't clear the stores.
    await testUninitializeGlean();

    const mockUploader = new WaitableUploader();
    const pingBody = mockUploader.waitForPingSubmission(DELETION_REQUEST_PING_NAME);

    await testInitializeGlean(
      testAppId,
      true,
      {
        httpClient: mockUploader,
      });
    Glean.setUploadEnabled(false);
    // If ping was not sent this promise will reject.
    const { ping_info: info } = await pingBody;
    const reasonCodes = JSON.parse(JSON.stringify(info));

    assert.strictEqual(reasonCodes.reason, "set_upload_enabled");
    assert.strictEqual(Context.uploadEnabled, false);
  });

  it("deletion request is sent when toggling upload from on to off and the pings queue is full", async function() {
    const httpClient = new WaitableUploader();
    await testResetGlean(testAppId, true, { httpClient });

    // Fill up the pending pings queue.
    const custom = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: true,
    });
    for (let i = 0; i < 10; i++) {
      custom.submit();
    }

    const waitForDeletionRequestPing = httpClient.waitForPingSubmission(DELETION_REQUEST_PING_NAME);
    Glean.setUploadEnabled(false);
    await Context.dispatcher.testBlockOnQueue();

    // This throws in case the ping is not sent.
    await waitForDeletionRequestPing;
    assert.strictEqual(Context.uploadEnabled, false);
  });

  it("deletion request ping is sent when toggling upload status between runs", async function() {
    Glean.setUploadEnabled(true);

    // Un-initialize, but don't clear the stores.
    await testUninitializeGlean(false);

    const mockUploader = new WaitableUploader();
    const pingBody = mockUploader.waitForPingSubmission("deletion-request");
    await testInitializeGlean(
      testAppId,
      false,
      {
        httpClient: mockUploader,
      }
    );

    // If ping was not sent this promise will reject.
    const { ping_info: info } = await pingBody;
    const reasonCodes = JSON.parse(JSON.stringify(info));

    assert.strictEqual(reasonCodes.reason, "at_init");
    assert.strictEqual(Context.uploadEnabled, false);
  });

  it("deletion request ping is not sent if upload status does not change between runs", async function () {
    const mockUploader = new WaitableUploader();
    let pingBody = mockUploader.waitForPingSubmission("deletion-request");
    await testResetGlean(
      testAppId,
      true,
      {
        httpClient: mockUploader,
      }
    );

    Glean.setUploadEnabled(false);
    // If ping was not sent this promise will reject.
    await pingBody;
    assert.strictEqual(Context.uploadEnabled, false);

    // Can't clear stores here,
    // otherwise Glean won't know upload has been disabled in a previous run.
    await testUninitializeGlean(false);

    pingBody = mockUploader.waitForPingSubmission("deletion-request");
    await testInitializeGlean(
      testAppId,
      false,
      {
        httpClient: mockUploader,
      }
    );

    // If ping was not sent this promise will reject.
    await assert.rejects(pingBody);
    assert.strictEqual(Context.uploadEnabled, false);
  });

  it("deletion request ping is not sent when user starts Glean for the first time with upload disabled", async function () {
    const postSpy = sandbox.spy(Context.platform.uploader, "post");
    await testResetGlean(testAppId, false);
    assert.strictEqual(postSpy.callCount, 0);
    assert.strictEqual(Context.uploadEnabled, false);
  });

  it("setting log pings works before and after and on initialize", async function () {
    await testUninitializeGlean();

    // Setting before initialize.
    Glean.setLogPings(true);
    await testInitializeGlean(testAppId, true);
    await Context.dispatcher.testBlockOnQueue();
    assert.ok(Context.config.logPings);

    // Setting after initialize.
    Glean.setLogPings(false);
    assert.ok(!Context.config.logPings);
  });

  it("setting debug view tag works before and after and on initialize", async function () {
    await testUninitializeGlean();

    const testTag = "test";

    await testUninitializeGlean();

    // Setting before initialize.
    Glean.setDebugViewTag(testTag);
    await testInitializeGlean(testAppId, true);
    await Context.dispatcher.testBlockOnQueue();
    assert.strictEqual(Context.config.debugViewTag, testTag);

    // Setting after initialize.
    const anotherTestTag = "another-test";
    Glean.setDebugViewTag(anotherTestTag);
    assert.strictEqual(Context.config.debugViewTag, anotherTestTag);
  });

  it("attempting to set an invalid debug view tag is ignored", async function () {
    const invaligTag = "inv@l!d_t*g";
    Glean.setDebugViewTag(invaligTag);
    await Context.dispatcher.testBlockOnQueue();
    assert.strictEqual(Context.config.debugViewTag, undefined);
  });

  it("setting source tags on initialize works", async function () {
    await testUninitializeGlean();
    await testInitializeGlean(testAppId, true);
    Glean.setSourceTags(["1", "2", "3", "4", "5"]);
    await Context.dispatcher.testBlockOnQueue();
    assert.strictEqual(Context.config.sourceTags?.toString(), "1,2,3,4,5");
  });

  it("attempting to set invalid source tags is ignored", async function () {
    const invaligTags = ["inv@l!d_t*g"];
    Glean.setSourceTags(invaligTags);
    await Context.dispatcher.testBlockOnQueue();
    assert.strictEqual(Context.config.sourceTags, undefined);
  });

  it("testResetGlean correctly resets", async function () {
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const TEST_VALUE = "TEST VALUE";
    metric.set(TEST_VALUE);

    assert.strictEqual(await metric.testGetValue(), TEST_VALUE);
    await testResetGlean(testAppId);

    assert.strictEqual(await metric.testGetValue(), undefined);
  });

  it("appBuild and appDisplayVersion are correctly reported", async function () {
    await testUninitializeGlean();

    const testBuild = "test";
    const testDisplayVersion = "1.2.3-stella";

    await testInitializeGlean(testAppId, true, { appBuild: testBuild, appDisplayVersion: testDisplayVersion });
    await Context.dispatcher.testBlockOnQueue();

    assert.strictEqual(await Glean.coreMetrics.appBuild.testGetValue(), testBuild);
    assert.strictEqual(await Glean.coreMetrics.appDisplayVersion.testGetValue(), testDisplayVersion);
  });

  // Verification test, does not test anything the Dispatcher suite doesn't cover,
  // instead tests the same things in a more real world like scenario.
  //
  // Related to: https://github.com/mozilla-extensions/bergamot-browser-extension/issues/49
  it("verify that glean APIs are execute in a block when called inside an async function", async function() {
    // Stop ping uploading for it not to interfere with this tests.
    //
    // This disables the uploading and deletion of pings from the pings database,
    // this allows us to query the database to check that our pings are as expected.
    stopGleanUploader();

    const custom = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });

    // This is application lifetime so that we can verify the
    // order of the recorded values in between submissions of the custom ping.
    const counter = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: [ "custom" ],
      lifetime: Lifetime.Application,
      disabled: false
    });

    // Synchoronous function that records and submits a ping.
    //
    // This is the catch, even if this is called inside an async function
    // it will be executed to completion, guaranteeing one count per async action.
    const recordMetricAndSendPing = () => {
      counter.add();
      custom.submit();
    };

    // Simustaneously execute async actions that include recording metrics and submitting a ping.
    await Promise.all(
      [...Array(10).keys()].map(() => {
        return (async () => {
          // Sleep for a random amount of time,
          // this will make the recordingAndSend call below be called at non-deterministic times.
          await (new Promise<void>(resolve => setTimeout(() => resolve(), Math.random() * 100)));
          // Record metrics and submit a ping in a synchronous function.
          recordMetricAndSendPing();
        })();
      }),
    );

    await Context.dispatcher.testBlockOnQueue();
    const storedPings = await Context.pingsDatabase.getAllPings();
    const counterValues = [];
    for (const [_, ping] of storedPings) {
      const metrics = ping.payload.metrics;
      const counterValue = isObject(metrics) && isObject(metrics.counter) ? metrics.counter["aCategory.aCounterMetric"] : undefined;
      // Get the value of `aCounterMetric` inside each submitted ping.
      counterValues.push(Number(counterValue));
    }

    // If we really recorded one metric and submitted one ping per async action,
    // we should have a clean 1,2,3,4,5,6,7,8,9,10 count
    // as counter.add should have been called only once in between ping submissions.
    assert.deepStrictEqual(
      counterValues,
      [1,2,3,4,5,6,7,8,9,10]
    );
  });

  it("disallow changing the platform after Glean is initialized", function() {
    const MockPlatform = {
      ...TestPlatform,
      name: "mock"
    };

    Glean.setPlatform(MockPlatform);

    assert.strictEqual(TestPlatform.name, Context.platform.name);
  });

  it("shutdown allows all pending pings to be sent before shutting down uploader", async function() {
    const postSpy = sandbox.spy(Context.platform.uploader, "post");

    // `setUploadEnabled` is a task dispatched on the main dispatcher,
    // this task will dispatch an upload task to the upload dispatcher.
    //
    // We want to be sure the ping uploader dispatcher is not shutdown
    // before it can execute this final task.
    Glean.setUploadEnabled(false);
    await Glean.shutdown();

    assert.strictEqual(postSpy.callCount, 1);
    assert.ok(postSpy.getCall(0).args[0].indexOf(DELETION_REQUEST_PING_NAME) !== -1);
  });

  it("attempting to shutdown Glean prior to initialize is a no-op", async function() {
    await testUninitializeGlean();

    const launchSpy = sandbox.spy(Context.dispatcher, "launch");
    await Glean.shutdown();
    assert.strictEqual(launchSpy.callCount, 0);
  });

  it("events database is initialized at a time when metrics can already be recorded", async function() {
    const event = new EventMetricType({
      category: "test",
      name: "event",
      sendInPings: ["custom"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    // Record this event, so that when we re-initialize the events database
    // it will record a glean.restarted event on the `custom` ping events list.
    event.record();

    await testResetGlean(testAppId, true, undefined, false);

    // Check that Glean was able to record the `glean.restarted` event on initialization.
    const restartedEvent = getGleanRestartedEventMetric(["custom"]);
    // We expect two events. One that was recorded when we recorded an event on the custom ping
    // for the first time and another once we re-initialized.
    assert.strictEqual((await restartedEvent.testGetValue("custom"))?.length, 2);
  });

  it("glean is not initialized if uploadEnabled or applicationId are not the right type", async function() {
    await testUninitializeGlean();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await testResetGlean(["not", "string"], true);
    assert.strictEqual(Context.initialized, false);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await testResetGlean(testAppId, "not boolean");
    assert.strictEqual(Context.initialized, false);

    await testResetGlean(testAppId, true);
    assert.strictEqual(Context.initialized, true);
  });

  it("setUploadEnabled does nothing in case a non-boolean value is passed to it", async function() {
    // Set the current upload value to false,
    // strings are "truthy", this way we can be sure calling with the wrong type dod not work.
    Glean.setUploadEnabled(false);
    await Context.dispatcher.testBlockOnQueue();
    assert.strictEqual(Context.uploadEnabled, false);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Glean.setUploadEnabled("not a boolean");
    await Context.dispatcher.testBlockOnQueue();
    assert.strictEqual(Context.uploadEnabled, false);
  });
});
