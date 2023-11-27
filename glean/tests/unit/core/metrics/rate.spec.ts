/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { ErrorType } from "../../../../src/core/error/error_type";

import Glean from "../../../../src/core/glean";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import RateMetricType from "../../../../src/core/metrics/types/rate";
import { Context } from "../../../../src/core/context";
import { testResetGlean } from "../../../../src/core/testing";

describe("RateMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function() {
    testResetGlean(testAppId);
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("attempting to add when glean upload is disabled is a no-op", function() {
    Glean.setUploadEnabled(false);

    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(10);
    assert.strictEqual(metric.testGetValue("aPing"), undefined);
    metric.addToDenominator(10);
    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(10);
    assert.deepStrictEqual(metric.testGetValue("aPing"), { numerator: 10, denominator: 0 });

    const snapshotOne = Context.metricsDatabase.getPingMetrics("aPing", false);
    assert.deepStrictEqual(snapshotOne, {
      "rate": {
        "aCategory.aRateMetric": {
          "numerator": 10,
          "denominator": 0
        }
      }
    });

    metric.addToDenominator(10);
    assert.deepStrictEqual(metric.testGetValue("aPing"), { numerator: 10, denominator: 10 });

    const snapshotTwo = Context.metricsDatabase.getPingMetrics("aPing", false);
    assert.deepStrictEqual(snapshotTwo, {
      "rate": {
        "aCategory.aRateMetric": {
          "numerator": 10,
          "denominator": 10
        }
      }
    });
  });

  it("set properly sets the value in all pings", function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(10);
    let expectedValue = { numerator: 10, denominator: 0 };

    assert.deepStrictEqual(metric.testGetValue("aPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("twoPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("threePing"), expectedValue);

    metric.addToDenominator(10);
    expectedValue = { numerator: 10, denominator: 10 };

    assert.deepStrictEqual(metric.testGetValue("aPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("twoPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("threePing"), expectedValue);
  });

  it("must not increment when passed zero or negative", function () {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(-1);
    metric.addToDenominator(-1);

    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 2);
    assert.deepStrictEqual(metric.testGetValue("aPing"), undefined);

    metric.addToNumerator(22);
    metric.addToDenominator(7);

    assert.deepStrictEqual(metric.testGetValue("aPing"), {numerator: 22, denominator: 7});
  });

  it("transformation works", function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(2);
    let expectedValue = { numerator: 2, denominator: 0 };
    assert.deepStrictEqual(metric.testGetValue("aPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("twoPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("threePing"), expectedValue);

    metric.addToDenominator(2);
    expectedValue = { numerator: 2, denominator: 2 };
    assert.deepStrictEqual(metric.testGetValue("aPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("twoPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("threePing"), expectedValue);

    metric.addToNumerator(2);
    expectedValue = { numerator: 4, denominator: 2 };
    assert.deepStrictEqual(metric.testGetValue("aPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("twoPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("threePing"), expectedValue);

    metric.addToDenominator(2);
    expectedValue = { numerator: 4, denominator: 4 };
    assert.deepStrictEqual(metric.testGetValue("aPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("twoPing"), expectedValue);
    assert.deepStrictEqual(metric.testGetValue("threePing"), expectedValue);
  });

  it("saturates at boundary", function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(2);
    assert.deepStrictEqual(
      metric.testGetValue("aPing"),
      { numerator: 2, denominator: 0 }
    );

    metric.addToNumerator(Number.MAX_SAFE_INTEGER);
    assert.deepStrictEqual(
      metric.testGetValue("aPing"),
      { numerator: Number.MAX_SAFE_INTEGER, denominator: 0 }
    );

    metric.addToDenominator(2);
    assert.deepStrictEqual(
      metric.testGetValue("aPing"),
      { numerator: Number.MAX_SAFE_INTEGER, denominator: 2 }
    );

    metric.addToDenominator(Number.MAX_SAFE_INTEGER);
    assert.deepStrictEqual(
      metric.testGetValue("aPing"),
      { numerator: Number.MAX_SAFE_INTEGER, denominator: Number.MAX_SAFE_INTEGER }
    );
  });

  it("attempting to record a value of incorrect type records an error", function () {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metric.addToDenominator("not number");
    // Floating point numbers should also record an error
    metric.addToDenominator(Math.PI);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metric.addToNumerator("not number");
    // Floating point numbers should also record an error
    metric.addToNumerator(Math.PI);

    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidType), 4);
    assert.strictEqual(metric.testGetValue(), undefined);
  });
});
