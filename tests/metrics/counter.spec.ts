/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Glean from "glean";
import CounterMetric from "metrics/counter";
import { Lifetime } from "metrics";
  
describe("CounterMetric", function() {
  beforeEach(async function() {
    await Glean.testRestGlean();
  });
 
  it("attemping to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new CounterMetric({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });
  
  it("attemping to add when glean upload is disabled is a no-op", async function() {
    Glean.uploadEnabled = false;

    const metric = new CounterMetric({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });
  
    await metric.add(10);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const metric = new CounterMetric({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });
  
    await metric.add(10);
    assert.strictEqual(await metric.testGetValue("aPing"), 10);
  
    const snapshot = await Glean.db.getPing("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "counter": {
        "aCategory.aCounterMetric": 10
      }
    });
  });
  
  it("set properly sets the value in all pings", async function() {
    const metric = new CounterMetric({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.add(10);
    assert.strictEqual(await metric.testGetValue("aPing"), 10);
    assert.strictEqual(await metric.testGetValue("twoPing"), 10);
    assert.strictEqual(await metric.testGetValue("threePing"), 10);
  });

  it("must not increment when passed zero or negative", async function() {
    const metric = new CounterMetric({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.add(0);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);

    await metric.add(-1);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);

    await metric.add(1);
    assert.strictEqual(await metric.testGetValue("aPing"), 1);
  });

  it("transformation works", async function() {
    const metric = new CounterMetric({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.add(2);
    assert.strictEqual(await metric.testGetValue("aPing"), 2);
    assert.strictEqual(await metric.testGetValue("twoPing"), 2);
    assert.strictEqual(await metric.testGetValue("threePing"), 2);

    await metric.add(2);
    assert.strictEqual(await metric.testGetValue("aPing"), 4);
    assert.strictEqual(await metric.testGetValue("twoPing"), 4);
    assert.strictEqual(await metric.testGetValue("threePing"), 4);

    await metric.add(2);
    assert.strictEqual(await metric.testGetValue("aPing"), 6);
    assert.strictEqual(await metric.testGetValue("twoPing"), 6);
    assert.strictEqual(await metric.testGetValue("threePing"), 6);
  });

  it("saturates at boundary", async function() {
    const metric = new CounterMetric({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.add(2);
    assert.strictEqual(await metric.testGetValue("aPing"), 2);
    await metric.add(Number.MAX_SAFE_INTEGER);
    assert.strictEqual(await metric.testGetValue("aPing"), Number.MAX_SAFE_INTEGER);
  });
});
