/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Glean from "glean";
import { BooleanMetricTypeInternal, BooleanMetricTypeExternal } from "metrics/types/boolean";
import { Lifetime } from "metrics";

const sandbox = sinon.createSandbox();

describe("BooleanMetric", function() {
  beforeEach(async function() {
    await Glean.testResetGlean("something something");
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("attemping to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new BooleanMetricTypeInternal({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attemping to set when glean upload is disabled is a no-op", async function() {
    await Glean.setUploadEnabled(false);

    const metric = new BooleanMetricTypeInternal({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set(true);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const metric = new BooleanMetricTypeInternal({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set(true);
    assert.strictEqual(await metric.testGetValue("aPing"), true);

    const snapshot = await Glean.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "boolean": {
        "aCategory.aBooleanMetric": true
      }
    });
  });

  it("set properly sets the value in all pings", async function() {
    const metric = new BooleanMetricTypeInternal({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set(true);
    assert.strictEqual(await metric.testGetValue("aPing"), true);
    assert.strictEqual(await metric.testGetValue("twoPing"), true);
    assert.strictEqual(await metric.testGetValue("threePing"), true);
  });

  it("public api works as expected", async function() {
    const metric = new BooleanMetricTypeExternal({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const spy = sandbox.spy(Glean.dispatcher, "launch");
    metric.set(true);
    assert.strictEqual(spy.callCount, 1);
    await Glean.dispatcher.blockOnQueue();
    assert.strictEqual(await metric.testGetValue("aPing"), true);
  });
});
