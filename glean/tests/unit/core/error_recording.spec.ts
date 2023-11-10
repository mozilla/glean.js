/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import { ErrorType } from "../../../src/core/error/error_type";
import { Context } from "../../../src/core/context";
import { Lifetime } from "../../../src/core/metrics/lifetime";
import { InternalStringMetricType as StringMetricType } from "../../../src/core/metrics/types/string";
import { testResetGlean } from "../../../src/core/testing";
import { combineIdentifierAndLabel } from "../../../src/core/metrics/types/labeled";

describe("error_recording", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function() {
    testResetGlean(testAppId);
  });

  it("records error types correctly", function () {
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    Context.errorManager.record(metric, ErrorType.InvalidValue, "Invalid value");
    Context.errorManager.record(metric, ErrorType.InvalidLabel, "Invalid label", 10);

    assert.strictEqual(Context.errorManager.testGetNumRecordedErrors(metric, ErrorType.InvalidValue), 1);
    assert.strictEqual(Context.errorManager.testGetNumRecordedErrors(metric, ErrorType.InvalidLabel), 10);
  });

  it("strips label when recording error to metric that contains label in it's name", function () {
    // Cannot use the LabeledMetricType here,
    // because it does not expose the internal metric types.
    const metric: Record<string, StringMetricType> = {
      oneLabel: new StringMetricType(
        {
          category: "aCategory",
          name: combineIdentifierAndLabel("aLabeledStringMetric", "oneLabel"),
          sendInPings: ["aPing", "twoPing", "threePing"],
          lifetime: Lifetime.Ping,
          disabled: false
        }
      ),
      anotherLabel: new StringMetricType(
        {
          category: "aCategory",
          name: combineIdentifierAndLabel("aLabeledStringMetric", "anotherLabel"),
          sendInPings: ["aPing", "twoPing", "threePing"],
          lifetime: Lifetime.Ping,
          disabled: false
        }
      ),
      dynamicLabel: new StringMetricType(
        {
          category: "aCategory",
          name: "aLabeledStringMetric",
          sendInPings: ["aPing", "twoPing", "threePing"],
          lifetime: Lifetime.Ping,
          disabled: false,
          dynamicLabel: "someDynamicLabel"
        }
      )
    };

    // When the metric is created from a static label, it will contain the label in it's name,
    // otherwise the label stays underd the `dynamicLabel` property.
    Context.errorManager.record(metric.oneLabel, ErrorType.InvalidValue, "Invalid value");
    Context.errorManager.record(metric.anotherLabel, ErrorType.InvalidLabel, "Invalid label", 10);

    assert.strictEqual(Context.errorManager.testGetNumRecordedErrors(metric.dynamicLabel, ErrorType.InvalidValue), 1);
    assert.strictEqual(Context.errorManager.testGetNumRecordedErrors(metric.dynamicLabel, ErrorType.InvalidLabel), 10);
  });
});
