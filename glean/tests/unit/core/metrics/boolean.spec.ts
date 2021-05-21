/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { Context } from "../../../../src/core/context";

import Glean from "../../../../src/core/glean";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import BooleanMetricType from "../../../../src/core/metrics/types/boolean";

describe("BooleanMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new BooleanMetricType({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attempting to set when glean upload is disabled is a no-op", async function() {
    Glean.setUploadEnabled(false);

    const metric = new BooleanMetricType({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(true);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const metric = new BooleanMetricType({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(true);
    assert.strictEqual(await metric.testGetValue("aPing"), true);

    const snapshot = await Context.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "boolean": {
        "aCategory.aBooleanMetric": true
      }
    });
  });

  it("set properly sets the value in all pings", async function() {
    const metric = new BooleanMetricType({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(true);
    assert.strictEqual(await metric.testGetValue("aPing"), true);
    assert.strictEqual(await metric.testGetValue("twoPing"), true);
    assert.strictEqual(await metric.testGetValue("threePing"), true);
  });
});
