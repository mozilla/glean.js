/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { Context } from "../../../../src/core/context";
import { ErrorType } from "../../../../src/core/error/error_type";

import Glean from "../../../../src/core/glean";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import QuantityMetricType from "../../../../src/core/metrics/types/quantity";
import { testResetGlean } from "../../../../src/core/testing";

describe("QuantityMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function() {
    testResetGlean(testAppId);
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("attempting to set when glean upload is disabled is a no-op", function() {
    Glean.setUploadEnabled(false);

    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(10);
    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(10);
    assert.strictEqual(metric.testGetValue("aPing"), 10);

    const snapshot = Context.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "quantity": {
        "aCategory.aQuantityMetric": 10
      }
    });
  });

  it("set properly sets the value in all pings", function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(0);
    assert.strictEqual(metric.testGetValue("aPing"), 0);
    assert.strictEqual(metric.testGetValue("twoPing"), 0);
    assert.strictEqual(metric.testGetValue("threePing"), 0);
  });

  it("must not set when passed negative", function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(-1);
    assert.strictEqual(metric.testGetValue("aPing"), undefined);
    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidValue, "aPing"), 1);
  });

  it("saturates at boundary", function() {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(Number.MAX_SAFE_INTEGER+1);
    assert.strictEqual(metric.testGetValue("aPing"), Number.MAX_SAFE_INTEGER);
  });

  it("attempting to record a value of incorrect type records an error", function () {
    const metric = new QuantityMetricType({
      category: "aCategory",
      name: "aQuantityMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metric.set("not number");
    // Floating point numbers should also record an error
    metric.set(Math.PI);

    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidType), 2);
    assert.strictEqual(metric.testGetValue(), undefined);
  });
});
