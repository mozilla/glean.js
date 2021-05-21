/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import { ErrorType } from "../../../src/core/error/error_type";
import { Context } from "../../../src/core/context";
import Glean from "../../../src/core/glean";
import { Lifetime } from "../../../src/core/metrics/lifetime";
import LabeledMetricType from "../../../src/core/metrics/types/labeled";
import StringMetricType from "../../../src/core/metrics/types/string";

describe("error_recording", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  it("records error types correctly", async function () {
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await Context.errorManager.record(metric, ErrorType.InvalidValue, "Invalid value");
    await Context.errorManager.record(metric, ErrorType.InvalidLabel, "Invalid label", 10);

    assert.strictEqual(await Context.errorManager.testGetNumRecordedErrors(metric, ErrorType.InvalidValue), 1);
    assert.strictEqual(await Context.errorManager.testGetNumRecordedErrors(metric, ErrorType.InvalidLabel), 10);
  });

  it("strips label when recording error to metric that contains label in it's name", async function () {
    const metric = new LabeledMetricType(
      {
        category: "aCategory",
        name: "aLabeledStringMetric",
        sendInPings: ["aPing", "twoPing", "threePing"],
        lifetime: Lifetime.Ping,
        disabled: false
      },
      StringMetricType,
      ["oneLabel", "anotherLabel"]
    );

    // When the metric is created from a static label, it will contain the label in it's name,
    // otherwise the label stays underd the `dynamicLabel` property.
    await Context.errorManager.record(metric.oneLabel, ErrorType.InvalidValue, "Invalid value");
    await Context.errorManager.record(metric.anotherLabel, ErrorType.InvalidLabel, "Invalid label", 10);

    assert.strictEqual(await Context.errorManager.testGetNumRecordedErrors(metric.dynamicLabel, ErrorType.InvalidValue), 1);
    assert.strictEqual(await Context.errorManager.testGetNumRecordedErrors(metric.dynamicLabel, ErrorType.InvalidLabel), 10);
  });
});
