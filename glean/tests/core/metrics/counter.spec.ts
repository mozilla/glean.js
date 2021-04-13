/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { Context } from "../../../src/core/context";

import Glean from "../../../src/core/glean";
import { Lifetime } from "../../../src/core/metrics/lifetime";
import CounterMetricType from "../../../src/core/metrics/types/counter";

describe("CounterMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });
 
  it("attempting to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });
  
  it("attempting to add when glean upload is disabled is a no-op", async function() {
    Glean.setUploadEnabled(false);

    const metric = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });
  
    metric.add(10);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const metric = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });
  
    metric.add(10);
    assert.strictEqual(await metric.testGetValue("aPing"), 10);
  
    const snapshot = await Context.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "counter": {
        "aCategory.aCounterMetric": 10
      }
    });
  });
  
  it("set properly sets the value in all pings", async function() {
    const metric = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.add(10);
    assert.strictEqual(await metric.testGetValue("aPing"), 10);
    assert.strictEqual(await metric.testGetValue("twoPing"), 10);
    assert.strictEqual(await metric.testGetValue("threePing"), 10);
  });

  it("must not increment when passed zero or negative", async function() {
    const metric = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.add(0);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);

    metric.add(-1);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);

    metric.add(1);
    assert.strictEqual(await metric.testGetValue("aPing"), 1);
  });

  it("transformation works", async function() {
    const metric = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.add(2);
    assert.strictEqual(await metric.testGetValue("aPing"), 2);
    assert.strictEqual(await metric.testGetValue("twoPing"), 2);
    assert.strictEqual(await metric.testGetValue("threePing"), 2);

    metric.add(2);
    assert.strictEqual(await metric.testGetValue("aPing"), 4);
    assert.strictEqual(await metric.testGetValue("twoPing"), 4);
    assert.strictEqual(await metric.testGetValue("threePing"), 4);

    metric.add(2);
    assert.strictEqual(await metric.testGetValue("aPing"), 6);
    assert.strictEqual(await metric.testGetValue("twoPing"), 6);
    assert.strictEqual(await metric.testGetValue("threePing"), 6);
  });

  it("saturates at boundary", async function() {
    const metric = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.add(2);
    assert.strictEqual(await metric.testGetValue("aPing"), 2);
    metric.add(Number.MAX_SAFE_INTEGER);
    assert.strictEqual(await metric.testGetValue("aPing"), Number.MAX_SAFE_INTEGER);
  });
});
