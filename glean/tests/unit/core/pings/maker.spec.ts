/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import type { ExtraMap } from "../../../../src/core/metrics/events_database/recorded_event";
import type { JSONArray } from "../../../../src/core/utils";

import Glean from "../../../../src/core/glean";
import { Context } from "../../../../src/core/context";
import EventMetricType from "../../../../src/core/metrics/types/event";
import { InternalPingType as PingType } from "../../../../src/core/pings/ping_type";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import * as PingMaker from "../../../../src/core/pings/maker";
import { testResetGlean, testRestartGlean } from "../../../../src/core/testing";

const sandbox = sinon.createSandbox();

describe("PingMaker", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function() {
    testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("ping info must contain a non-empty start and end time", function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    const pingInfo = PingMaker.buildPingInfoSection(ping);

    const startTime = new Date(pingInfo.start_time);
    const endTime = new Date(pingInfo.end_time);

    assert.ok(startTime.getTime() <= endTime.getTime());
  });

  it("buildPingInfo must report all the required fields", function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    const pingInfo = PingMaker.buildPingInfoSection(ping);

    assert.ok("seq" in pingInfo);
    assert.ok("start_time" in pingInfo);
    assert.ok("end_time" in pingInfo);
  });

  it("buildClientInfo must report all the available data", function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    // Clear the metrics database to fake a worst case scenario
    // when Glean doesn't have any of the required metrics
    // for building the client info.
    Context.metricsDatabase.clearAll();
    const clientInfo1 = PingMaker.buildClientInfoSection(ping);
    assert.ok("telemetry_sdk_build" in clientInfo1);

    // Initialize will also initialize core metrics that are part of the client info.
    testResetGlean(testAppId, true, {
      channel: "channel",
      appBuild:"build",
      appDisplayVersion: "display version",
      buildDate: new Date(),
      serverEndpoint: "http://localhost:8080"
    });

    const clientInfo2 = PingMaker.buildClientInfoSection(ping);
    assert.ok("telemetry_sdk_build" in clientInfo2);
    assert.ok("client_id" in clientInfo2);
    assert.ok("first_run_date" in clientInfo2);
    assert.ok("os" in clientInfo2);
    assert.ok("os_version" in clientInfo2);
    assert.ok("architecture" in clientInfo2);
    assert.ok("locale" in clientInfo2);
    assert.ok("build_date"in clientInfo2);
    assert.strictEqual(clientInfo2["app_channel"], "channel");
    assert.strictEqual(clientInfo2["app_build"], "build");
    assert.strictEqual(clientInfo2["app_display_version"], "display version");
  });

  it("collectPing must return `undefined` if ping that must not be sent if empty, is empty", function() {
    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    assert.strictEqual(PingMaker.collectPing(ping), undefined);
  });

  it("sequence numbers must be sequential", function() {
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
      assert.strictEqual(PingMaker.getSequenceNumber(ping1), i);
      assert.strictEqual(PingMaker.getSequenceNumber(ping2), i);
    }

    PingMaker.getSequenceNumber(ping1);
    assert.strictEqual(PingMaker.getSequenceNumber(ping1), 12);
    assert.strictEqual(PingMaker.getSequenceNumber(ping2), 11);
    assert.strictEqual(PingMaker.getSequenceNumber(ping1), 13);
  });

  it("getPingHeaders returns headers when custom headers are set", function () {
    Glean.setDebugViewTag("test");
    Glean.setSourceTags(["tag1", "tag2", "tag3"]);

    assert.deepStrictEqual({
      "X-Debug-ID": "test",
      "X-Source-Tags": "tag1,tag2,tag3"
    }, PingMaker.getPingHeaders());

    testResetGlean(testAppId);
    assert.strictEqual(PingMaker.getPingHeaders(), undefined);
  });

  it("should delete trailing restarted events", function() {
    Glean.pingUploader.blockUploads();

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

    const triggerCustomEvent = (event: EventMetricType<ExtraMap>) => {
      event.record();
      // Wait for recording action to complete
      event.testGetValue();
    };

    // Record events
    triggerCustomEvent(event);

    testRestartGlean();
    testRestartGlean();
    testRestartGlean();

    triggerCustomEvent(event);

    testRestartGlean();
    testRestartGlean();

    PingMaker.collectAndStorePing("ident", ping);
    const allPings = Object.fromEntries(Context.pingsDatabase.getAllPings());
    const eventsArray = allPings["ident"]["payload"]["events"] as JSONArray;

    assert.equal(5, eventsArray.length);

    Glean.pingUploader.resumeUploads();
  });
});
