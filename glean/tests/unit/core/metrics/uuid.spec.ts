/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { v4 as UUIDv4 } from "uuid";

import Glean from "../../../../src/core/glean";
import UUIDMetricType from "../../../../src/core/metrics/types/uuid";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import { Context } from "../../../../src/core/context";
import { ErrorType } from "../../../../src/core/error/error_type";
import { testResetGlean } from "../../../../src/core/testing";

describe("UUIDMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function() {
    testResetGlean(testAppId);
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", function() {
    const metric = new UUIDMetricType({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("attempting to set when glean upload is disabled is a no-op", function() {
    Glean.setUploadEnabled(false);

    const metric = new UUIDMetricType({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.generateAndSet();
    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("attempting to set an invalid uuid is a no-op", function() {
    const metric = new UUIDMetricType({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("not valid");
    assert.strictEqual(metric.testGetValue("aPing"), undefined);
    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 1);
  });

  it("ping payload is correct", function() {
    const metric = new UUIDMetricType({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const expected = UUIDv4();
    metric.set(expected);
    assert.strictEqual(metric.testGetValue("aPing"), expected);

    const snapshot = Context.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "uuid": {
        "aCategory.aUUIDMetric": expected
      }
    });
  });

  it("set properly sets the value in all pings", function() {
    const metric = new UUIDMetricType({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const expected = UUIDv4();
    metric.set(expected);
    assert.strictEqual(metric.testGetValue("aPing"), expected);
    assert.strictEqual(metric.testGetValue("twoPing"), expected);
    assert.strictEqual(metric.testGetValue("threePing"), expected);
  });

  it("uuid is generated and stored", function() {
    const metric = new UUIDMetricType({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const value = metric.generateAndSet();
    assert.strictEqual(value, metric.testGetValue("aPing"));
  });

  it("attempting to record a value of incorrect type records an error", function () {
    const metric = new UUIDMetricType({
      category: "aCategory",
      name: "aUUIDMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metric.set({ "not": "string" });

    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidType), 1);
    assert.strictEqual(metric.testGetValue(), undefined);
  });
});
