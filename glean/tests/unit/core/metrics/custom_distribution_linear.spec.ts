/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { ErrorType } from "../../../../src/core/error/error_type";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import CustomDistributionMetricType from "../../../../src/core/metrics/types/custom_distribution";
import { testResetGlean } from "../../../../src/core/testing";
import { HistogramType } from "../../../../src/histogram/histogram";

const sandbox = sinon.createSandbox();

describe("CustomDistributionMetric - Linear", function () {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function () {
    await testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("serializer should correctly serialize custom distribution", async function () {
    const metric = new CustomDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aCustomDistribution",
        sendInPings: ["aPing"],
      },
      1,
      100,
      100,
      HistogramType.linear
    );

    metric.accumulateSamples([50]);

    const snapshot = await metric.testGetValue("aPing");
    assert.equal(snapshot?.sum, 50);
  });

  it("set value properly sets the value in all stores", function () {
    const storesNames = ["aPing", "bPing"];

    const metric = new CustomDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aCustomDistribution",
        sendInPings: storesNames,
      },
      1,
      100,
      100,
      HistogramType.linear
    );

    metric.accumulateSamples([50]);

    storesNames.forEach(async (store) => {
      const snapshot = await metric.testGetValue(store);
      assert.equal(snapshot?.count, 1);
      assert.equal(snapshot?.sum, 50);
      assert.equal(snapshot?.values[50], 1);
    });
  });

  it("the accumulate samples api correctly stores values", async function () {
    const metric = new CustomDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aCustomDistribution",
        sendInPings: ["aPing"],
      },
      1,
      100,
      100,
      HistogramType.linear
    );

    // Accumulate the samples. We intentionally do not report
    // negative values to not trigger error reporting.
    metric.accumulateSamples([1, 2, 3]);

    const snapshot = await metric.testGetValue("aPing");

    // Check that we got the right sum of samples.
    assert.equal(snapshot?.sum, 6);

    // Check that we got the right count of samples.
    assert.equal(snapshot?.count, 3);

    // We should get a sample in 3 buckets.
    // These numbers are a bit magic, but they correspond to
    // `hist.sampleToBucketMinimum(i)` for `i = 1..=3`.
    assert.equal(1, snapshot?.values[1]);
    assert.equal(1, snapshot?.values[2]);
    assert.equal(1, snapshot?.values[3]);

    // No errors should be reported.
    assert.equal(0, await metric.testGetNumRecordedErrors(ErrorType.InvalidValue));
  });

  it("the accumulate samples api correctly handles negative values", async function () {
    const metric = new CustomDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aCustomDistribution",
        sendInPings: ["aPing"],
      },
      1,
      100,
      100,
      HistogramType.linear
    );

    // Accumulate the samples.
    metric.accumulateSamples([-1, 1, 2, 3]);

    const snapshot = await metric.testGetValue("aPing");

    // Check that we got the right sum of samples.
    assert.equal(snapshot?.sum, 6);

    // Check that we got the right count of samples.
    assert.equal(snapshot?.count, 3);

    // 1 error should be reported.
    assert.equal(1, await metric.testGetNumRecordedErrors(ErrorType.InvalidValue));
  });

  it("json snapshotting works", async function () {
    const metric = new CustomDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aCustomDistribution",
        sendInPings: ["aPing"],
      },
      1,
      100,
      100,
      HistogramType.linear
    );

    metric.accumulateSamples([50]);

    const expectedJson = {
      count: 1,
      sum: 50,
      values: {
        "50": 1,
      },
    };

    const snapshot = await metric.testGetValue("aPing");
    assert.deepStrictEqual(snapshot, expectedJson);
  });
});
