/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { ErrorType } from "../../../../src/core/error/error_type";

import Glean from "../../../../src/core/glean";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import RateMetricType from "../../../../src/core/metrics/types/rate";

describe("RateMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  it("smoke test for rate metric", async function() {
    await Glean.testResetGlean(testAppId);
    Glean.setUploadEnabled(true);

    const metric = new RateMetricType({
      category: "aCategory",
      name: "aRate",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.add_to_numerator(0);
    metric.add_to_denominator(0);

    assert.strictEqual(await metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 0);

    metric.add_to_numerator(-1);
    metric.add_to_denominator(-1);

    assert.strictEqual(await metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 2);

    assert.deepStrictEqual(await metric.testGetValue("aPing"), {numerator: 0, denominator: 0});

    metric.add_to_numerator(22);
    metric.add_to_denominator(7);

    assert.deepStrictEqual(await metric.testGetValue("aPing"), {numerator: 22, denominator: 7});
  });
});