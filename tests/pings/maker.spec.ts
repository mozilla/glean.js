/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import PingType from "pings";
import * as PingMaker from "pings/maker";
import Glean from "glean";

describe("PingMaker", function() {
  beforeEach(async function() {
    await Glean.testResetGlean("something something");
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
    Glean.initialize("something something", true, {
      appBuild:"build",
      appDisplayVersion: "display version",
      serverEndpoint: "http://localhost:8080"
    });
    await Glean.dispatcher.testBlockOnQueue();

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
});
