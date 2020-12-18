/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { v4 as UUIDv4 } from "uuid";

import Glean from "glean";
import UUIDMetric, { isUUIDMetricPayload } from "metrics/uuid";
import { Lifetime } from "metrics";
 
describe("UUIDMetric", function() {
  beforeEach(async function() {
    await Glean.resetGlean();
  });
 
  it("attemping to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new UUIDMetric({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });
 
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attemping to set when glean upload is disabled is a no-op", async function() {
    Glean.uploadEnabled = false;

    const metric = new UUIDMetric({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set();
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attemping to set an invalid uuid is a no-op", async function() {
    Glean.uploadEnabled = false;

    const metric = new UUIDMetric({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set("not valid");
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const metric = new UUIDMetric({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const expected = UUIDv4();
    await metric.set(expected);
    assert.strictEqual(await metric.testGetValue("aPing"), expected);

    const snapshot = await Glean.db.getPing("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "uuid": {
        "aCategory.aUUIDMetric": expected
      }
    });
  });
 
  it("set properly sets the value in all pings", async function() {
    const metric = new UUIDMetric({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const expected = UUIDv4();
    await metric.set(expected);
    assert.strictEqual(await metric.testGetValue("aPing"), expected);
    assert.strictEqual(await metric.testGetValue("twoPing"), expected);
    assert.strictEqual(await metric.testGetValue("threePing"), expected);
  });

  it("uuid is generated and stored", async function() {
    const metric = new UUIDMetric({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set();
    assert(isUUIDMetricPayload(await metric.testGetValue("aPing")));
  });
});
