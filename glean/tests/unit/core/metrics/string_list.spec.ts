/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { Context } from "../../../../src/core/context";
import { ErrorType } from "../../../../src/core/error/error_type";

import Glean from "../../../../src/core/glean";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import StringListMetricType, { MAX_LIST_LENGTH, MAX_STRING_LENGTH_IN_BYTES } from "../../../../src/core/metrics/types/string_list";
import { testResetGlean } from "../../../../src/core/testing";

describe("StringListMetric", function () {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function () {
    testResetGlean(testAppId);
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", function () {
    const metric = new StringListMetricType({
      category: "aCategory",
      name: "aStringListMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("attempting to set when glean upload is disabled is a no-op", function () {
    Glean.setUploadEnabled(false);

    const metric = new StringListMetricType({
      category: "aCategory",
      name: "aStringListMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(["test_string_one", "test_string_two"]);
    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", function () {
    const metric = new StringListMetricType({
      category: "aCategory",
      name: "aStringListMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(["test_string_one", "test_string_two"]);
    assert.deepStrictEqual(metric.testGetValue("aPing"), ["test_string_one", "test_string_two"]);

    const snapshot = Context.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "string_list": {
        "aCategory.aStringListMetric": ["test_string_one", "test_string_two"]
      }
    });
  });

  it("set properly sets the value in all pings", function () {
    const metric = new StringListMetricType({
      category: "aCategory",
      name: "aStringListMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set(["test_string_one", "test_string_two"]);
    assert.deepStrictEqual(metric.testGetValue("aPing"), ["test_string_one", "test_string_two"]);
    assert.deepStrictEqual(metric.testGetValue("twoPing"), ["test_string_one", "test_string_two"]);
    assert.deepStrictEqual(metric.testGetValue("threePing"), ["test_string_one", "test_string_two"]);
  });

  it("long string list is truncated", function () {
    const metric = new StringListMetricType({
      category: "aCategory",
      name: "aStringListMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const testStringList = [];
    const expectedStringList = [];
    const testString = "test";
    for (let i = 0; i < MAX_LIST_LENGTH; ++i) {
      testStringList.push(testString);
      expectedStringList.push(testString);
    }
    testStringList.push(testString);

    metric.set(testStringList);
    assert.deepStrictEqual(
      metric.testGetValue("aPing"),
      expectedStringList
    );

    assert.strictEqual(
      metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 1
    );
  });

  it("long string is truncated", function () {
    const metric = new StringListMetricType({
      category: "aCategory",
      name: "aStringListMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const testString = "01234567890".repeat(20);
    const testStringList = [testString];
    metric.set(testStringList);
    const expectedList = [testString.substring(0, MAX_STRING_LENGTH_IN_BYTES)];
    assert.deepStrictEqual(
      metric.testGetValue("aPing"),
      expectedList
    );

    assert.strictEqual(
      metric.testGetNumRecordedErrors(ErrorType.InvalidOverflow), 1
    );
  });

  it("attempt to add string to string list of maximum length records an error", function () {
    const metric = new StringListMetricType({
      category: "aCategory",
      name: "aStringListMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false,
    });

    const testString = "test";
    const testStringList = Array(MAX_LIST_LENGTH - 1).fill(testString);

    // We create the array on the above line, this is fine. We know it is a string array.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    metric.set(testStringList);
    metric.add(testString);
    assert.strictEqual(
      metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 0
    );

    testStringList.push(testString);
    assert.deepStrictEqual(
      metric.testGetValue("aPing"),
      testStringList
    );

    metric.add(testString);
    assert.strictEqual(
      metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 1
    );
  });

  it("attempting to set to empty list does not record error", function () {
    const metric = new StringListMetricType({
      category: "aCategory",
      name: "aStringListMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const testStringList: string[] = [];
    metric.set(testStringList);
    assert.deepStrictEqual(metric.testGetValue("aPing"), testStringList);
    assert.strictEqual(
      metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 0
    );
  });

  it("attempting to record a value of incorrect type records an error", function () {
    const metric = new StringListMetricType({
      category: "aCategory",
      name: "aStringListMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metric.set("not string list");
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metric.set(["one", "two", { "not": "string" }]);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metric.add({ "not": "string" });

    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidType), 3);
    assert.strictEqual(metric.testGetValue(), undefined);
  });
});
