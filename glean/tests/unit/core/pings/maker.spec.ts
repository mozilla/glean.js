/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import PingType from "../../../../src/core/pings/ping_type";
import * as PingMaker from "../../../../src/core/pings/maker";
import Glean from "../../../../src/core/glean";
import CoreEvents from "../../../../src/core/events";
import Plugin from "../../../../src/plugins";
import type { JSONObject } from "../../../../src/core/utils";
import { Context } from "../../../../src/core/context";
import { stopGleanUploader } from "../../../utils";
import EventMetricType from "../../../../src/core/metrics/types/event";
import { Lifetime } from "../../../../src/core/metrics/lifetime";

const sandbox = sinon.createSandbox();

class MockPlugin extends Plugin<typeof CoreEvents["afterPingCollection"]> {
  constructor() {
    super(CoreEvents["afterPingCollection"].name, "mockPlugin");
  }

  action(): Promise<JSONObject> {
    return Promise.resolve({ "you": "got mocked!" });
  }
}

describe("PingMaker", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("ping info must contain a non-empty start and end time", async function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    const pingInfo = await PingMaker.buildPingInfoSection(ping);

    const startTime = new Date(pingInfo.start_time);
    const endTime = new Date(pingInfo.end_time);

    assert.ok(startTime.getTime() <= endTime.getTime());
  });

  it("buildPingInfo must report all the required fields", async function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    const pingInfo = await PingMaker.buildPingInfoSection(ping);

    assert.ok("seq" in pingInfo);
    assert.ok("start_time" in pingInfo);
    assert.ok("end_time" in pingInfo);
  });

  it("buildClientInfo must report all the available data", async function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    // Clear the metrics database to fake a worst case scenario
    // when Glean doesn't have any of the required metrics
    // for building the client info.
    await Context.metricsDatabase.clearAll();
    const clientInfo1 = await PingMaker.buildClientInfoSection(ping);
    assert.ok("telemetry_sdk_build" in clientInfo1);

    // Initialize will also initialize core metrics that are part of the client info.
    await Glean.testResetGlean(testAppId, true, {
      channel: "channel",
      appBuild:"build",
      appDisplayVersion: "display version",
      serverEndpoint: "http://localhost:8080"
    });

    const clientInfo2 = await PingMaker.buildClientInfoSection(ping);
    assert.ok("telemetry_sdk_build" in clientInfo2);
    assert.ok("client_id" in clientInfo2);
    assert.ok("first_run_date" in clientInfo2);
    assert.ok("os" in clientInfo2);
    assert.ok("os_version" in clientInfo2);
    assert.ok("architecture" in clientInfo2);
    assert.ok("locale" in clientInfo2);
    assert.strictEqual(clientInfo2["app_channel"], "channel");
    assert.strictEqual(clientInfo2["app_build"], "build");
    assert.strictEqual(clientInfo2["app_display_version"], "display version");
  });

  it("collectPing must return `undefined` if ping that must not be sent if empty, is empty", async function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    assert.strictEqual(await PingMaker.collectPing(ping), undefined);
  });

  it("sequence numbers must be sequential", async function() {
    const ping1 = new PingType({
      name: "ping1",
      includeClientId: true,
      sendIfEmpty: true,
    });
    const ping2 = new PingType({
      name: "ping2",
      includeClientId: true,
      sendIfEmpty: true,
    });

    for(let i = 0; i <= 10; i++) {
      assert.strictEqual(await PingMaker.getSequenceNumber(ping1), i);
      assert.strictEqual(await PingMaker.getSequenceNumber(ping2), i);
    }

    await PingMaker.getSequenceNumber(ping1);
    assert.strictEqual(await PingMaker.getSequenceNumber(ping1), 12);
    assert.strictEqual(await PingMaker.getSequenceNumber(ping2), 11);
    assert.strictEqual(await PingMaker.getSequenceNumber(ping1), 13);
  });

  it("getPingHeaders returns headers when custom headers are set", async function () {
    Glean.setDebugViewTag("test");
    Glean.setSourceTags(["tag1", "tag2", "tag3"]);
    await Context.dispatcher.testBlockOnQueue();

    assert.deepStrictEqual({
      "X-Debug-ID": "test",
      "X-Source-Tags": "tag1,tag2,tag3"
    }, PingMaker.getPingHeaders());

    await Glean.testResetGlean(testAppId);
    assert.strictEqual(PingMaker.getPingHeaders(), undefined);
  });

  it("collect and store triggers the AfterPingCollection and deals with possible result correctly", async function () {
    // Disable ping uploading for it not to interfere with this tests.
    await stopGleanUploader();

    await Glean.testResetGlean(testAppId, true, { plugins: [ new MockPlugin() ]});
    const ping = new PingType({
      name: "ping",
      includeClientId: true,
      sendIfEmpty: true,
    });

    await PingMaker.collectAndStorePing("ident", ping);
    const recordedPing = Object.fromEntries(
      (await Context.pingsDatabase.getAllPings())
    )["ident"];
    assert.deepStrictEqual(recordedPing.payload, { "you": "got mocked!" });

    await Glean.testResetGlean(testAppId, true);
    await PingMaker.collectAndStorePing("ident", ping);
    const recordedPingNoPlugin = Object.fromEntries(
      (await Context.pingsDatabase.getAllPings())
    )["ident"];
    assert.notDeepStrictEqual(recordedPingNoPlugin.payload, { "you": "got mocked!" });
  });

  it("ping payload is logged before it is modified by a plugin", async function () {
    // Disable ping uploading for it not to interfere with this tests.
    await stopGleanUploader();

    await Glean.testResetGlean(testAppId, true, {
      debug: {
        logPings: true
      },
      plugins: [ new MockPlugin() ]
    });

    const ping = new PingType({
      name: "ping",
      includeClientId: true,
      sendIfEmpty: true,
    });

    const consoleSpy = sandbox.spy(console, "info");
    await PingMaker.collectAndStorePing("ident", ping);

    // Need to get the second argument of the console.info call,
    // because the first one contains the log tag.
    const loggedPayload = JSON.parse(consoleSpy.lastCall.args[1]) as JSONObject;

    const recordedPing = Object.fromEntries(
      (await Context.pingsDatabase.getAllPings())
    )["ident"];
    assert.deepStrictEqual(recordedPing.payload, { "you": "got mocked!" });
    assert.notDeepStrictEqual(loggedPayload, { "you": "got mocked!" });
    assert.ok("client_info" in loggedPayload);
    assert.ok("ping_info" in loggedPayload);
  });

  it("pings are not recorded in case a plugin throws", async function () {
    class ThrowingPlugin extends Plugin<typeof CoreEvents["afterPingCollection"]> {
      constructor() {
        super(CoreEvents["afterPingCollection"].name, "mockPlugin");
      }

      action(): Promise<JSONObject> {
        throw new Error();
      }
    }

    await Glean.testResetGlean(testAppId, true, {
      debug: {
        logPings: true
      },
      plugins: [ new ThrowingPlugin() ]
    });

    const ping = new PingType({
      name: "ping",
      includeClientId: true,
      sendIfEmpty: true,
    });

    await PingMaker.collectAndStorePing("ident", ping);

    const recordedPings = await Context.pingsDatabase.getAllPings();
    assert.ok(!("ident" in recordedPings));
  });

  it("errors recorded during events collection make it to the current payload", async function () {
    const ping = new PingType({
      name: "aPing",
      includeClientId: true,
      sendIfEmpty: true,
    });
    const event = new EventMetricType({
      category: "test",
      name: "aEvent",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    event.record();
    // Wait for recording action to complete.
    await event.testGetValue();

    // Un-initialize and re-initialize manually instead of using testResetGlean
    // in order to have control over the startTime at initialization.
    await Glean.testUninitialize(false);
    // Move the clock backwards by one hour.
    //
    // This will generate incoherent timestamps in events at collection time
    // and record an `InvalidValue` error for the `glean.restarted` event.
    Context.startTime.setTime(Context.startTime.getTime() - 1000 * 60 * 60);
    await Glean.testInitialize(testAppId, true);

    event.record();
    // Wait for recording action to complete.
    await event.testGetValue();

    await PingMaker.collectAndStorePing("ident", ping);
    const allPings = Object.fromEntries(await Context.pingsDatabase.getAllPings());
    const payload = allPings["ident"]["payload"];

    // Check that the expected error metric is in the payload
    assert.ok(payload?.metrics);
    assert.deepStrictEqual(payload.metrics, {
      labeled_counter: { "glean.error.invalid_value": { "glean.restarted": 1 } }
    });
  });
});
