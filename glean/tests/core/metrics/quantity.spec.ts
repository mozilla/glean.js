/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { Context } from "../../../src/core/context";
import { ErrorType } from "../../../src/core/error_recording";

import Glean from "../../../src/core/glean";
import { Lifetime } from "../../../src/core/metrics/lifetime";
import QuantityMetricType from "../../../src/core/metrics/types/quantity";

describe("QuantityMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attempting to set when glean upload is disabled is a no-op", async function() {
    Glean.setUploadEnabled(false);

    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(10);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(10);
    assert.strictEqual(await metric.testGetValue("aPing"), 10);

    const snapshot = await Context.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "quantity": {
        "aCategory.aQuantityMetric": 10
      }
    });
  });

  it("set properly sets the value in all pings", async function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(0);
    assert.strictEqual(await metric.testGetValue("aPing"), 0);
    assert.strictEqual(await metric.testGetValue("twoPing"), 0);
    assert.strictEqual(await metric.testGetValue("threePing"), 0);
  });

  it("must not set when passed negative", async function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(-1);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);

    assert.strictEqual(await metric.testGetNumRecordedErrors(ErrorType.InvalidValue, "aPing"), 1);
  });

  it("saturates at boundary", async function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(Number.MAX_SAFE_INTEGER+1);
    assert.strictEqual(await metric.testGetValue("aPing"), Number.MAX_SAFE_INTEGER);
  });
});
