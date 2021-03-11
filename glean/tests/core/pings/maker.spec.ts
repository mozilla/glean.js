/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import PingType from "../../../src/core/pings";
import * as PingMaker from "../../../src/core/pings/maker";
import Glean from "../../../src/core/glean";
import CoreEvents from "../../../src/core/events";
import Plugin from "../../../src/plugins";
import { JSONObject } from "../../../src/core/utils";

const sandbox = sinon.createSandbox();

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
    await Glean.testUninitialize();
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    const clientInfo1 = await PingMaker.buildClientInfoSection(ping);
    assert.ok("telemetry_sdk_build" in clientInfo1);

    // Initialize will also initialize core metrics that are part of the client info.
    await Glean.testInitialize(testAppId, true, {
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
    assert.ok("app_build" in clientInfo2);
    assert.ok("app_display_version" in clientInfo2);
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
    await Glean.dispatcher.testBlockOnQueue();

    assert.deepStrictEqual({
      "X-Debug-ID": "test",
      "X-Source-Tags": "tag1,tag2,tag3"
    }, PingMaker.getPingHeaders());

    Glean.unsetDebugViewTag();
    Glean.unsetSourceTags();
    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(PingMaker.getPingHeaders(), undefined);
  });

  it("collect and store triggers the AfterPingCollection and deals with possible result correctly", async function () {
    // Disable ping uploading for it not to interfere with this tests.
    sandbox.stub(Glean["pingUploader"], "triggerUpload").callsFake(() => Promise.resolve());

    class MockPlugin extends Plugin<typeof CoreEvents["afterPingCollection"]> {
      constructor() {
        super(CoreEvents["afterPingCollection"].name, "mockPlugin");
      }

      action(): Promise<JSONObject> {
        return Promise.resolve({ "you": "got mocked!" });
      }
    }

    await Glean.testResetGlean(testAppId, true, { plugins: [ new MockPlugin() ]});
    const ping = new PingType({
      name: "ping",
      includeClientId: true,
      sendIfEmpty: true,
    });

    await PingMaker.collectAndStorePing("ident", ping);
    const recordedPing = (await Glean.pingsDatabase.getAllPings())["ident"];
    assert.deepStrictEqual(recordedPing.payload, { "you": "got mocked!" });

    await Glean.testResetGlean(testAppId, true);
    await PingMaker.collectAndStorePing("ident", ping);
    const recordedPingNoPlugin = (await Glean.pingsDatabase.getAllPings())["ident"];
    assert.notDeepStrictEqual(recordedPingNoPlugin.payload, { "you": "got mocked!" });
  });
});
