/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Glean from "../../../../src/core/glean";
import StringMetricType, { MAX_STRING_LENGTH_IN_BYTES } from "../../../../src/core/metrics/types/string";
import { Lifetime } from "../../../../src/core/metrics/lifetime";

import { Context } from "../../../../src/core/context";
import { ErrorType } from "../../../../src/core/error/error_type";
import { testResetGlean } from "../../../../src/core/testing";

describe("StringMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function() {
    testResetGlean(testAppId);
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", function() {
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("attempting to set when glean upload is disabled is a no-op", function() {
    Glean.setUploadEnabled(false);

    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("test_string_value");
    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", function() {
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("test_string_value");
    assert.strictEqual(metric.testGetValue("aPing"), "test_string_value");

    const snapshot = Context.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "string": {
        "aCategory.aStringMetric": "test_string_value"
      }
    });
  });

  it("set properly sets the value in all pings", function() {
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("test_string_value");
    assert.strictEqual(metric.testGetValue("aPing"), "test_string_value");
    assert.strictEqual(metric.testGetValue("twoPing"), "test_string_value");
    assert.strictEqual(metric.testGetValue("threePing"), "test_string_value");
  });

  it("long string values are truncated", function() {
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const testString = "01234567890".repeat(20);
    metric.set(testString);

    assert.strictEqual(
      metric.testGetValue("aPing"),
      testString.substring(0, MAX_STRING_LENGTH_IN_BYTES)
    );

    assert.strictEqual(
      metric.testGetNumRecordedErrors(ErrorType.InvalidOverflow), 1
    );
  });

  it("attempting to record a value of incorrect type records an error", function () {
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
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
