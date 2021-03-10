/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import { CLIENT_INFO_STORAGE, DELETION_REQUEST_PING_NAME, KNOWN_CLIENT_ID } from "../../src/core/constants";
import CoreEvents from "../../src/core/events";
import Glean from "../../src/core/glean";
import { Lifetime } from "../../src/core/metrics";
import StringMetricType from "../../src/core/metrics/types/string";
import PingType from "../../src/core/pings";
import { JSONObject } from "../../src/core/utils";
import TestPlatform from "../../src/platform/qt";
import Plugin from "../../src/plugins";

const GLOBAL_APPLICATION_ID = "org.mozilla.glean.test.app";
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
  beforeEach(async function() {
    await Glean.testResetGlean(GLOBAL_APPLICATION_ID);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("client_id and first_run_date are regenerated if cleared", async function() {
    await Glean["metricsDatabase"].clearAll();
    assert.strictEqual(
      await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE), undefined);
    assert.strictEqual(
      await Glean["coreMetrics"]["firstRunDate"].testGetValue(CLIENT_INFO_STORAGE), undefined);

    await Glean.testUninitialize();
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true);
    assert.ok(await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE));
    assert.ok(await Glean["coreMetrics"]["firstRunDate"].testGetValue(CLIENT_INFO_STORAGE));
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
    const originalFirstRunDate = await Glean["coreMetrics"]["firstRunDate"]
      .testGetValueAsString(CLIENT_INFO_STORAGE);

    Glean.setUploadEnabled(false);
    assert.strictEqual(
      await Glean["coreMetrics"]["firstRunDate"].testGetValueAsString(CLIENT_INFO_STORAGE),
      originalFirstRunDate
    );

    Glean.setUploadEnabled(true);
    assert.strictEqual(
      await Glean["coreMetrics"]["firstRunDate"].testGetValueAsString(CLIENT_INFO_STORAGE),
      originalFirstRunDate
    );
  });

  it("client_id is managed correctly when toggling uploading", async function() {
    const originalClientId = await Glean["coreMetrics"]["clientId"]
      .testGetValue(CLIENT_INFO_STORAGE);
    assert.ok(originalClientId);
    assert.ok(originalClientId !== KNOWN_CLIENT_ID);

    Glean.setUploadEnabled(false);
    assert.strictEqual(
      await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE),
      KNOWN_CLIENT_ID
    );

    Glean.setUploadEnabled(true);
    const newClientId = await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE);
    assert.ok(newClientId !== originalClientId);
    assert.ok(newClientId !== KNOWN_CLIENT_ID);
  });

  it("client_id is set to known value when uploading disabled at start", async function() {
    await Glean.testUninitialize();
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, false);
    assert.strictEqual(
      await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE),
      KNOWN_CLIENT_ID
    );
  });

  it("client_id is set to random value when uploading enabled at start", async function() {
    Glean.setUploadEnabled(false);
    await Glean.testUninitialize();
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true);
    const clientId = await Glean["coreMetrics"]["clientId"]
      .testGetValue(CLIENT_INFO_STORAGE);
    assert.ok(clientId);
    assert.ok(clientId !== KNOWN_CLIENT_ID);
  });

  it("enabling when already enabled is a no-op", async function() {
    const spy = sandbox.spy(Glean["coreMetrics"], "initialize");
    Glean.setUploadEnabled(true);
    // Wait for `setUploadEnabled` to be executed.
    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(spy.callCount, 0);
  });

  it("disabling when already disabled is a no-op", async function() {
    const spy = sandbox.spy(Glean["pingUploader"], "clearPendingPingsQueue");
    Glean.setUploadEnabled(false);
    Glean.setUploadEnabled(false);
    // Wait for `setUploadEnabled` to be executed both times.
    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(spy.callCount, 1);
  });

  it("initialization throws if applicationId is an empty string", async function() {
    await Glean.testUninitialize();
    try {
      await Glean.testInitialize("", true);
      assert.ok(false);
    } catch {
      assert.ok(true);
    }
  });

  it("initialization throws if serverEndpoint is an invalida URL", async function() {
    await Glean.testUninitialize();
    try {
      await Glean.testInitialize(GLOBAL_APPLICATION_ID, true, { serverEndpoint: "" });
      assert.ok(false);
    } catch {
      assert.ok(true);
    }
  });

  it("initialization registers plugins when provided", async function() {
    await Glean.testUninitialize();

    const mockPlugin = new MockPlugin();
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true, {
      // We need to ignore TypeScript here,
      // otherwise it will error since mockEvent is not listed as a Glean event in core/events.ts
      //
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      plugins: [ mockPlugin ]
    });

    assert.deepStrictEqual(CoreEvents["afterPingCollection"]["plugin"], mockPlugin);

    await Glean.testUninitialize();
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true);
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
    await Glean.testUninitialize();
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true);
    // initialize is dispatched, we must await on the queue being completed to assert things.
    await Glean.dispatcher.testBlockOnQueue();

    // This time it should not be called, which means upload should not be switched to `false`.
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, false);
    assert.ok(Glean.isUploadEnabled());
  });

  it("flipping upload enabled respects order of events", async function() {
    await Glean.testUninitialize();

    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: true,
    });
    const postSpy = sandbox.spy(Glean.platform.uploader, "post");

    // Start Glean with upload enabled.
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true);
    // Immediatelly disable upload.
    Glean.setUploadEnabled(false);
    ping.submit();

    await Glean.dispatcher.testBlockOnQueue();
    // TODO: Make this nicer once we resolve Bug 1691033 is resolved.
    await Glean["pingUploader"]["currentJob"];

    // Check that one ping was sent,
    // but that ping is not our custom ping, but the deletion-request.
    assert.ok(postSpy.getCall(0).args[0].indexOf(DELETION_REQUEST_PING_NAME) !== -1);
    assert.strictEqual(postSpy.callCount, 1);
  });

  it("deletion request is sent when toggling upload from on to off", async function() {
    const postSpy = sandbox.spy(Glean.platform.uploader, "post");

    Glean.setUploadEnabled(false);
    await Glean.dispatcher.testBlockOnQueue();

    assert.strictEqual(postSpy.callCount, 1);
    assert.ok(postSpy.getCall(0).args[0].indexOf(DELETION_REQUEST_PING_NAME) !== -1);

    postSpy.resetHistory();
    Glean.setUploadEnabled(true);
    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(postSpy.callCount, 0);
  });

  it("deletion request ping is sent when toggling upload status between runs", async function() {
    const postSpy = sandbox.spy(TestPlatform.uploader, "post");

    Glean.setUploadEnabled(true);
    await Glean.dispatcher.testBlockOnQueue();

    // Can't use testResetGlean here because it clears all stores
    // and when there is no client_id at all stored, a deletion ping is also not sent.
    await Glean.testUninitialize();
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, false);

    // TODO: Make this nicer once Bug 1691033 is resolved.
    await Glean["pingUploader"]["currentJob"];

    // A deletion request is sent
    assert.strictEqual(postSpy.callCount, 1);
    assert.ok(postSpy.getCall(0).args[0].indexOf(DELETION_REQUEST_PING_NAME) !== -1);
  });

  it("deletion request ping is not sent if upload status does not change between runs", async function () {
    const postSpy = sandbox.spy(Glean.platform.uploader, "post");

    Glean.setUploadEnabled(false);
    await Glean.dispatcher.testBlockOnQueue();

    // A deletion request is sent
    assert.strictEqual(postSpy.callCount, 1);
    assert.ok(postSpy.getCall(0).args[0].indexOf(DELETION_REQUEST_PING_NAME) !== -1);

    // Can't use testResetGlean here because it clears all stores
    // and when there is no client_id at all stored, a deletion ping is also not set.
    await Glean.testUninitialize();
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, false);
    await Glean.dispatcher.testBlockOnQueue();
    // TODO: Make this nicer once we resolve Bug 1691033 is resolved.
    await Glean["pingUploader"]["currentJob"];

    postSpy.resetHistory();
    assert.strictEqual(postSpy.callCount, 0);
  });

  it("deletion request ping is not sent when user starts Glean for the first time with upload disabled", async function () {
    const postSpy = sandbox.spy(Glean.platform.uploader, "post");
    await Glean.testResetGlean(GLOBAL_APPLICATION_ID, false);
    assert.strictEqual(postSpy.callCount, 0);
  });

  it("setting log pings works before and after and on initialize", async function () {
    await Glean.testUninitialize();

    // Setting on initialize.
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true, { debug: { logPings: true } });
    await Glean.dispatcher.testBlockOnQueue();
    assert.ok(Glean.logPings);

    await Glean.testUninitialize();

    // Setting before initialize.
    Glean.setLogPings(true);
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true);
    await Glean.dispatcher.testBlockOnQueue();
    assert.ok(Glean.logPings);

    // Setting after initialize.
    Glean.setLogPings(false);
    assert.ok(!Glean.logPings);
  });

  it("setting debug view tag works before and after and on initialize", async function () {
    await Glean.testUninitialize();

    const testTag = "test";

    // Setting on initialize.
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true, { debug: { debugViewTag: testTag } });
    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(Glean.debugViewTag, testTag);

    await Glean.testUninitialize();

    // Setting before initialize.
    Glean.setDebugViewTag(testTag);
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true);
    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(Glean.debugViewTag, testTag);

    // Setting after initialize.
    const anotherTestTag = "another-test";
    Glean.setDebugViewTag(anotherTestTag);
    assert.strictEqual(Glean.debugViewTag, anotherTestTag);
  });

  it("attempting to set an invalid debug view tag is ignored and no task is dispatched", function () {
    const dispatchSpy = sandbox.spy(Glean.dispatcher, "launch");

    const invaligTag = "inv@l!d_t*g";
    Glean.setDebugViewTag(invaligTag);
    assert.strictEqual(Glean.debugViewTag, undefined);
    assert.ok(dispatchSpy.notCalled);
  });

  it("unsetting a debug view tag works", async function () {
    // Unsetting when nothing is set is a no-op
    Glean.unsetDebugViewTag();
    assert.strictEqual(Glean.debugViewTag, undefined);

    Glean.setDebugViewTag("test");
    Glean.unsetDebugViewTag();

    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(Glean.debugViewTag, undefined);
  });

  it("setting source tags on initialize works", async function () {
    await Glean.testUninitialize();
    await Glean.testInitialize(GLOBAL_APPLICATION_ID, true, { debug: { sourceTags: ["1", "2", "3", "4", "5"] } });
    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(Glean.sourceTags, "1,2,3,4,5");
  });

  it("attempting to set invalid source tags is ignored and no task is dispatched", function () {
    const dispatchSpy = sandbox.spy(Glean.dispatcher, "launch");

    const invaligTags = ["inv@l!d_t*g"];
    Glean.setSourceTags(invaligTags);
    assert.strictEqual(Glean.sourceTags, undefined);
    assert.ok(dispatchSpy.notCalled);
  });

  it("unsetting source tags works", async function () {
    // Unsetting when nothing is set is a no-op
    Glean.unsetSourceTags();
    assert.strictEqual(Glean.sourceTags, undefined);

    Glean.setSourceTags(["test"]);
    Glean.unsetSourceTags();

    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(Glean.sourceTags, undefined);
  });
});
