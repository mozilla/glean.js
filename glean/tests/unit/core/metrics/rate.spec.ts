/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { ErrorType } from "../../../../src/core/error/error_type";

import Glean from "../../../../src/core/glean";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import RateMetricType from "../../../../src/core/metrics/types/rate";
import { Context } from "../../../../src/core/context";

describe("RateMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attempting to add when glean upload is disabled is a no-op", async function() {
    Glean.setUploadEnabled(false);

    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToDenominator(10);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(10);
    assert.deepStrictEqual(await metric.testGetValue("aPing"), { numerator: 10, denominator: 0 });

    const snapshot = await Context.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "rate": {
        "aCategory.aRateMetric": {
          "numerator": 10,
          "denominator": 0
        }
      }
    });
  });

  it("set properly sets the value in all pings", async function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(10);
    const expectedValue = { numerator: 10, denominator: 0 };

    assert.deepStrictEqual(await metric.testGetValue("aPing"), expectedValue);
    assert.deepStrictEqual(await metric.testGetValue("twoPing"), expectedValue);
    assert.deepStrictEqual(await metric.testGetValue("threePing"), expectedValue);
  });

  it("must not increment when passed zero or negative", async function () {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(0);
    metric.addToDenominator(0);

    assert.strictEqual(await metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 0);
    assert.deepStrictEqual(await metric.testGetValue("aPing"), { numerator: 0, denominator: 0 });

    metric.addToNumerator(-1);
    metric.addToDenominator(-1);

    assert.strictEqual(await metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 2);
    assert.deepStrictEqual(await metric.testGetValue("aPing"), {numerator: 0, denominator: 0});

    metric.addToNumerator(22);
    metric.addToDenominator(7);

    assert.deepStrictEqual(await metric.testGetValue("aPing"), {numerator: 22, denominator: 7});
  });

  it("transformation works", async function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(2);
    let expectedValue = { numerator: 2, denominator: 0 };
    assert.deepStrictEqual(await metric.testGetValue("aPing"), expectedValue);
    assert.deepStrictEqual(await metric.testGetValue("twoPing"), expectedValue);
    assert.deepStrictEqual(await metric.testGetValue("threePing"), expectedValue);

    metric.addToDenominator(2);
    expectedValue = { numerator: 2, denominator: 2 };
    assert.deepStrictEqual(await metric.testGetValue("aPing"), expectedValue);
    assert.deepStrictEqual(await metric.testGetValue("twoPing"), expectedValue);
    assert.deepStrictEqual(await metric.testGetValue("threePing"), expectedValue);
  });

  it("saturates at boundary", async function() {
    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRateMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.addToNumerator(2);
    assert.deepStrictEqual(
      await metric.testGetValue("aPing"),
      { numerator: 2, denominator: 0 }
    );

    metric.addToNumerator(Number.MAX_SAFE_INTEGER);
    assert.deepStrictEqual(
      await metric.testGetValue("aPing"),
      { numerator: Number.MAX_SAFE_INTEGER, denominator: 0 }
    );

    metric.addToDenominator(2);
    assert.deepStrictEqual(
      await metric.testGetValue("aPing"),
      { numerator: Number.MAX_SAFE_INTEGER, denominator: 2 }
    );

    metric.addToDenominator(Number.MAX_SAFE_INTEGER);
    assert.deepStrictEqual(
      await metric.testGetValue("aPing"),
      { numerator: Number.MAX_SAFE_INTEGER, denominator: Number.MAX_SAFE_INTEGER }
    );
  });
});