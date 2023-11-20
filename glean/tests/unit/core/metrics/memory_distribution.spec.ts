/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { ErrorType } from "../../../../src/core/error/error_type";
import Glean from "../../../../src/core/glean";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import { convertMemoryUnitToBytes, MemoryUnit } from "../../../../src/core/metrics/memory_unit";
import MemoryDistributionMetricType, {
  MemoryDistributionMetric,
} from "../../../../src/core/metrics/types/memory_distribution";
import { testResetGlean } from "../../../../src/core/testing";
import { isUndefined } from "../../../../src/core/utils";

const sandbox = sinon.createSandbox();

describe("MemoryDistributionMetric", function () {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function () {
    testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("serializer should correctly serialize memory distribution", function () {
    const kb = 1024;

    const metric = new MemoryDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aMemoryDistribution",
        sendInPings: ["aPing"],
      },
      MemoryUnit.Kilobyte
    );

    metric.accumulate(100000);
    const snapshot = metric.testGetValue("aPing");
    assert.equal(snapshot?.sum, 100000 * kb);
  });

  it("set value properly sets the value in all stores", function () {
    const storeNames = ["aPing", "bPing"];

    const metric = new MemoryDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aMemoryDistribution",
        sendInPings: storeNames,
      },
      MemoryUnit.Byte
    );

    metric.accumulate(100000);

    storeNames.forEach((store) => {
      const snapshot = metric.testGetValue(store);
      assert.equal(100000, snapshot?.sum);
    });
  });

  it("the accumulate samples api correctly stores memory values", function () {
    const metric = new MemoryDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aMemoryDistribution",
        sendInPings: ["aPing"],
      },
      MemoryUnit.Kilobyte
    );

    // Accumulate the samples. We intentionally do not report
    // negative values to not trigger error reporting.
    metric.accumulateSamples([1, 2, 3]);

    const snapshot = metric.testGetValue("aPing");

    const kb = 1024;

    // Check that we got the right sum of samples.
    assert.equal(snapshot?.sum, 6 * kb);

    // We should get a sample in 3 buckets.
    // These numbers are a bit magic, but they correspond to
    // `hist.sampleToBucketMinimum(i * kb)` for `i = 1..3`.
    assert.equal(1, snapshot?.values[1023]);
    assert.equal(1, snapshot?.values[2047]);
    assert.equal(1, snapshot?.values[3024]);

    // No errors should be reported.
    assert.equal(0, metric.testGetNumRecordedErrors(ErrorType.InvalidValue));
  });

  it("the accumulate samples api correctly handles negative values", function () {
    const metric = new MemoryDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aMemoryDistribution",
        sendInPings: ["aPing"],
      },
      MemoryUnit.Kilobyte
    );

    // Accumulates the samples.
    metric.accumulateSamples([-1, 1, 2, 3]);

    const snapshot = metric.testGetValue("aPing");

    const kb = 1024;

    // Check that we got the right sum of samples.
    assert.equal(snapshot?.sum, 6 * kb);

    // We should get a sample in 3 buckets.
    // These numbers are a bit magic, but they correspond to
    // `hist.sampleToBucketMinimum(i * kb)` for `i = 1..3`.
    assert.equal(1, snapshot?.values[1023]);
    assert.equal(1, snapshot?.values[2047]);
    assert.equal(1, snapshot?.values[3024]);

    // 1 error should be reported.
    assert.equal(1, metric.testGetNumRecordedErrors(ErrorType.InvalidValue));
  });

  it("memory distribution internal representation validation works as expected", function () {
    // Invalid objects
    assert.throws(() => new MemoryDistributionMetric(undefined));
    assert.throws(() => new MemoryDistributionMetric(null));
    assert.throws(() => new MemoryDistributionMetric({}));
    assert.throws(() => new MemoryDistributionMetric({ rubbish: "garbage" }));
    assert.throws(() => new MemoryDistributionMetric({ rubbish: "garbage", values: "{}" }));

    // Invalid values
    assert.throws(
      () =>
        new MemoryDistributionMetric({
          "-100": 1,
          "-200": 2,
        })
    );

    // Valid values
    assert.doesNotThrow(() => new MemoryDistributionMetric([100, 200, 300]));
  });

  it("attempting to accumulate when glean upload is disabled is a no-op", function () {
    const metric = new MemoryDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aMemoryDistribution",
        sendInPings: ["aPing"],
      },
      MemoryUnit.Byte
    );

    Glean.setUploadEnabled(false);
    metric.accumulate(100000);

    const snapshot = metric.testGetValue("aPing");
    assert(isUndefined(snapshot));
  });

  it("converts memory units to bytes", function () {
    const expected = 1073741824;

    interface TestCase {
      unit: MemoryUnit;
      value: number;
    }

    const testCases: TestCase[] = [
      {
        unit: MemoryUnit.Byte,
        value: 1073741824,
      },
      {
        unit: MemoryUnit.Kilobyte,
        value: 1048576,
      },
      {
        unit: MemoryUnit.Megabyte,
        value: 1024,
      },
      {
        unit: MemoryUnit.Gigabyte,
        value: 1,
      },
    ];

    testCases.forEach((testCase) => {
      const result = convertMemoryUnitToBytes(testCase.value, testCase.unit);
      assert.equal(result, expected);
    });
  });
});
