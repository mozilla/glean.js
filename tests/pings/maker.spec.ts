/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import PingType from "pings";
import * as PingMaker from "pings/maker";
import Glean from "glean";

describe("PingMaker", function() {
  beforeEach(async function() {
    await Glean.testRestGlean();
  });

  it("ping info must contain a non-empty start and end time", async function() {
    const ping = new PingType("custom", true, false, []);
    const pingInfo = await PingMaker.buildPingInfoSection(ping);

    const startTime = new Date(pingInfo.start_time);
    const endTime = new Date(pingInfo.end_time);

    assert.ok(startTime.getTime() <= endTime.getTime());
  });

  it("buildPingInfo must report all the required fields", async function() {
    const ping = new PingType("custom", true, false, []);
    const pingInfo = await PingMaker.buildPingInfoSection(ping);

    assert.ok("seq" in pingInfo);
    assert.ok("start_time" in pingInfo);
    assert.ok("end_time" in pingInfo);
  });

  it("buildClientInfo must report all the available data", async function() {
    const ping = new PingType("custom", true, false, []);
    const clientInfo = await PingMaker.buildClientInfoSection(ping);

    assert.ok("telemetry_sdk_build" in clientInfo);
  });

  it("collectPing must return `undefined` if ping that must not be sent if empty, is empty", async function() {
    const ping = new PingType("custom", true, false, []);
    assert.strictEqual(await PingMaker.collectPing(ping), undefined);
  });

  it("sequence numbers must be sequential", async function() {
    const ping1 = new PingType("ping1", true, true, []);
    const ping2 = new PingType("ping2", true, true, []);

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
