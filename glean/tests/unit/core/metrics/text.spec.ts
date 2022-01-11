/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { Context } from "../../../../src/core/context";
import { ErrorType } from "../../../../src/core/error/error_type";

import Glean from "../../../../src/core/glean";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import TextMetricType, { TEXT_MAX_LENGTH } from "../../../../src/core/metrics/types/text";
import { testResetGlean } from "../../../../src/core/testing";

describe("TextMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await testResetGlean(testAppId);
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new TextMetricType({
      category: "aCategory",
      name: "aTextMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attempting to set when glean upload is disabled is a no-op", async function() {
    Glean.setUploadEnabled(false);

    const metric = new TextMetricType({
      category: "aCategory",
      name: "aTextMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("some value");
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const metric = new TextMetricType({
      category: "aCategory",
      name: "aTextMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const validValues = [
      "some value",
      "<html><head><title>Website</title></head><body><h1>Text</h1></body>",
      "some longer text\nwith newlines\nand also some quotes: \"once upon a time ...\"",
    ];

    for (const value of validValues) {
      metric.set(value);
      assert.strictEqual(await metric.testGetValue("aPing"), value);

      const snapshot = await Context.metricsDatabase.getPingMetrics("aPing", true);
      assert.deepStrictEqual(snapshot, {
        "text": {
          "aCategory.aTextMetric": value
        }
      });
    }
  });

  it("set properly sets the value in all pings", async function() {
    const metric = new TextMetricType({
      category: "aCategory",
      name: "aTextMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("some value");
    assert.strictEqual(await metric.testGetValue("aPing"), "some value");
    assert.strictEqual(await metric.testGetValue("twoPing"), "some value");
    assert.strictEqual(await metric.testGetValue("threePing"), "some value");
  });

  it("truncates when text exceeds maximum length and records errors", async function () {
    const metric = new TextMetricType({
      category: "aCategory",
      name: "aTextMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    const testText = `some value ${"a".repeat(TEXT_MAX_LENGTH)}`;
    metric.set(testText);
    const truncated = testText.substr(0, TEXT_MAX_LENGTH);

    assert.strictEqual(await metric.testGetValue("aPing"), truncated);
    assert.strictEqual(
      await metric.testGetNumRecordedErrors(ErrorType.InvalidOverflow), 1
    );
  });
});
