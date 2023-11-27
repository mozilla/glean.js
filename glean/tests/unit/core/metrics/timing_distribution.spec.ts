/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { testResetGlean } from "../../../../src/core/testing";
import TimingDistributionMetricType, {
  TimingDistributionMetric,
} from "../../../../src/core/metrics/types/timing_distribution";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import TimeUnit, { convertTimeUnitToNanos } from "../../../../src/core/metrics/time_unit";
import Glean from "../../../../src/core/glean";
import { Histogram } from "../../../../src/histogram/histogram";
import { Functional } from "../../../../src/histogram/functional";
import { ErrorType } from "../../../../src/core/error/error_type";
import { snapshot } from "../../../../src/core/metrics/distributions";

const sandbox = sinon.createSandbox();

describe("TimingDistributionMetric", function () {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function () {
    testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("can snapshot", function () {
    const hist = new Histogram(new Functional(2.0, 8.0));

    for (let i = 1; i <= 10; i++) {
      hist.accumulate(i);
    }

    const snap = snapshot(hist);

    const expectedJson = {
      count: 10,
      sum: 55,
      values: {
        "1": 1,
        "2": 1,
        "3": 1,
        "4": 1,
        "5": 1,
        "6": 1,
        "7": 1,
        "8": 1,
        "9": 1,
        "10": 1,
      },
    };

    assert.deepEqual(snap, expectedJson);
  });

  it("can snapshot sparse", function () {
    const hist = new Histogram(new Functional(2.0, 8.0));

    hist.accumulate(1024);
    hist.accumulate(1024);
    hist.accumulate(1116);
    hist.accumulate(1448);

    const snap = snapshot(hist);

    const expectedJson = {
      count: 4,
      sum: 4612,
      values: {
        "1024": 2,
        "1116": 1,
        "1448": 1,
      },
    };

    assert.deepEqual(snap, expectedJson);
  });

  it("serializer should correctly serialize timing distribution", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    const id = 100;
    const startTime = 0;
    const duration = 60;

    metric.setStart(id, startTime);
    metric.setStopAndAccumulate(id, duration);

    assert.equal((metric.testGetValue("aPing"))?.sum, duration);
  });

  it("set value properly sets the value in all stores", function () {
    const storesNames = ["aPing", "bPing"];

    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: storesNames,
      },
      TimeUnit.Nanosecond
    );

    const id = 100;
    const duration = 1;

    metric.setStart(id, 0);
    metric.setStopAndAccumulate(id, duration);

    storesNames.forEach((store) => {
      const snapshot = metric.testGetValue(store);

      assert.equal(snapshot?.sum, duration);
      assert.equal(snapshot?.values[1], 1);
      assert.equal(snapshot?.count, 1);
    });
  });

  it("timing distributions must not accumulate negative values", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    const id = 100;
    const duration = 60;

    // Flip around the timestamps, this should result in a negative value which should be
    // discarded.
    metric.setStart(id, duration);
    metric.setStopAndAccumulate(id, 0);

    assert.equal(metric.testGetValue("aPing"), undefined);
    assert.equal(1, metric.testGetNumRecordedErrors(ErrorType.InvalidValue));
  });

  it("the accumulate samples api correctly stores timing values", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Second
    );

    // Accumulate the samples. We intentionally do not report
    // negative values to not trigger error reporting.
    metric.setAccumulateSamples([1, 2, 3]);

    const snapshot = metric.testGetValue("aPing");
    const secondsToNanos = 1000 * 1000 * 1000;
    assert.equal(snapshot?.sum, 6 * secondsToNanos);

    // We should get a sample in 3 buckets.
    // These numbers are a bit magic, but they correspond to
    // `hist.sample_to_bucket_minimum(i * seconds_to_nanos)` for `i = 1..=3`.
    assert.equal(1, snapshot?.values[984625593]);
    assert.equal(1, snapshot?.values[1969251187]);
    assert.equal(1, snapshot?.values[2784941737]);

    // No errors should be reported.
    assert.equal(0, metric.testGetNumRecordedErrors(ErrorType.InvalidValue));
  });

  it("the accumulate samples api correctly handles negative values", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    // Accumulate the samples.
    metric.setAccumulateSamples([-1, 1, 2, 3]);

    const snapshot = metric.testGetValue("aPing");

    // Check that we got the right sum and number of samples.
    assert.equal(snapshot?.sum, 6);

    // We should get a sample in each of the first 3 buckets.
    assert.equal(1, snapshot?.values[1]);
    assert.equal(1, snapshot?.values[2]);
    assert.equal(1, snapshot?.values[3]);

    // 1 error should be reported.
    assert.equal(1, metric.testGetNumRecordedErrors(ErrorType.InvalidValue));
  });

  it("the accumulate samples api correctly handles overflowing values", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    // The MAX_SAMPLE_TIME is the same from `metrics/timing_distribution.rs`.
    const MAX_SAMPLE_TIME = 1000 * 1000 * 1000 * 60 * 10;
    const overflowingVal = MAX_SAMPLE_TIME + 1;
    // Accumulate the samples.
    metric.setAccumulateSamples([overflowingVal, 1, 2, 3]);

    const snapshot = metric.testGetValue("aPing");

    // Overflowing values are truncated to MAX_SAMPLE_TIME and recorded.
    assert.equal(snapshot?.sum, MAX_SAMPLE_TIME + 6);

    // We should get a sample in each of the first 3 buckets.
    assert.equal(1, snapshot?.values[1]);
    assert.equal(1, snapshot?.values[2]);
    assert.equal(1, snapshot?.values[3]);

    // 1 error should be reported.
    assert.equal(1, metric.testGetNumRecordedErrors(ErrorType.InvalidOverflow));
  });

  it("large nanosecond values", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    const time = convertTimeUnitToNanos(10, TimeUnit.Second);

    const id = 100;
    metric.setStart(id, 0);
    metric.setStopAndAccumulate(id, time);

    const snapshot = metric.testGetValue("aPing");

    // Check that we got the right sum and number of samples.
    assert.equal(snapshot?.sum, time);
  });

  it("stopping non existing id records an error", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    const id = 3785;
    metric.setStopAndAccumulate(id, 60);

    // 1 error should be reported.
    assert.equal(1, metric.testGetNumRecordedErrors(ErrorType.InvalidState, "aPing"));
  });

  it("the accumulate raw samples api correctly stores timing values", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Second
    );

    const secondsToNanos = 1000 * 1000 * 1000;
    metric.accumulateRawSamplesNanos([secondsToNanos, secondsToNanos * 2, secondsToNanos * 3]);

    const snapshot = metric.testGetValue("aPing");

    // Check that we got the right sum and number of samples.
    assert.equal(snapshot?.sum, 6 * secondsToNanos);

    // We should get a sample in 3 buckets.
    // These numbers are a bit magic, but they correspond to
    // `hist.sample_to_bucket_minimum(i * seconds_to_nanos)` for `i = 1..=3`.
    assert.equal(1, snapshot?.values[984625593]);
    assert.equal(1, snapshot?.values[1969251187]);
    assert.equal(1, snapshot?.values[2784941737]);

    // No errors should be reported.
    assert.equal(0, metric.testGetNumRecordedErrors(ErrorType.InvalidState, "aPing"));
  });

  it("raw samples api error cases", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    // 10 minutes in nanoseconds
    const maxSampleTime = 1000 * 1000 * 1000 * 60 * 10;

    metric.accumulateRawSamplesNanos([0, 1, maxSampleTime + 1]);

    const snapshot = metric.testGetValue("aPing");

    // Check that we got the right sum and number of samples.
    assert.equal(snapshot?.sum, 2 + maxSampleTime);

    // We should get a sample in 2 buckets.
    // These numbers are a bit magic, but they correspond to
    // `hist.sample_to_bucket_minimum(i * seconds_to_nanos)` for `i = {1, max_sample_time}`.
    assert.equal(2, snapshot?.values[1]);
    assert.equal(1, snapshot?.values[599512966122]);

    // 1 error should be reported.
    assert.equal(1, metric.testGetNumRecordedErrors(ErrorType.InvalidOverflow, "aPing"));
  });

  it("timing distribution internal representation validation works as expected", function () {
    // Invalid objects
    assert.throws(() => new TimingDistributionMetric(undefined));
    assert.throws(() => new TimingDistributionMetric(null));
    assert.throws(() => new TimingDistributionMetric({}));
    assert.throws(() => new TimingDistributionMetric({ rubbish: "garbage" }));
    assert.throws(() => new TimingDistributionMetric({ rubbish: "garbage", values: "{}" }));

    // Invalid values
    assert.throws(
      () =>
        new TimingDistributionMetric({
          "-100": 1,
          "-200": 2,
        })
    );

    // Valid values
    assert.doesNotThrow(() => new TimingDistributionMetric([100, 200, 200]));
  });

  it("cancelling a metric", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    const id = metric.start();
    metric.cancel(id);

    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("attempting to start/accumulate when glean upload is disabled is a no-op", function () {
    Glean.setUploadEnabled(false);

    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    const id = metric.start();
    metric.stopAndAccumulate(id);

    assert.strictEqual(metric.testGetValue("aPing"), undefined);
  });

  it("value accumulated when upload is not enabled gets removed", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    // This duration WILL NOT be accumulated because `uploadEnabled` was set to false
    // when we tried to accumulate.
    const id1 = metric.start();
    Glean.setUploadEnabled(false);
    metric.stopAndAccumulate(id1);

    // This duration WILL be accumulated. Timers that are started while upload is disabled
    // are still tracked. Since we accumulate after upload is re-enabled, this duration is
    // accumulated.
    const id2 = metric.start();
    Glean.setUploadEnabled(true);
    metric.stopAndAccumulate(id2);

    const testValue = metric.testGetValue("aPing");
    assert.equal(testValue?.count, 1);
  });

  it("multiple timers can be started, stopped, and cancelled in any order", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Nanosecond
    );

    const id1 = metric.start();
    const id2 = metric.start();
    const id3 = metric.start();

    metric.stopAndAccumulate(id3);
    metric.stopAndAccumulate(id1);
    metric.cancel(id2);

    const testValue = metric.testGetValue("aPing");
    assert.equal(testValue?.count, 2);
  });

  it("recording APIs properly sets the value in all pings", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing", "bPing", "cPing"],
      },
      TimeUnit.Nanosecond
    );

    const id = metric.start();
    metric.stopAndAccumulate(id);

    const testValueA = metric.testGetValue("aPing");
    assert.strictEqual(testValueA?.count, 1);
    assert.ok(!!testValueA?.sum, "The sum of the distribution should be greater than 0.");

    const testValueB = metric.testGetValue("bPing");
    assert.strictEqual(testValueB?.count, 1);
    assert.ok(!!testValueB?.sum, "The sum of the distribution should be greater than 0.");

    const testValueC = metric.testGetValue("cPing");
    assert.strictEqual(testValueC?.count, 1);
    assert.ok(!!testValueC?.sum, "The sum of the distribution should be greater than 0.");
  });

  it("recording multiple timings", function () {
    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing"],
      },
      TimeUnit.Second
    );

    const secondsToNanos = 1000 * 1000 * 1000;
    metric.accumulateRawSamplesNanos([
      secondsToNanos,
      secondsToNanos * 2,
      secondsToNanos * 3,
      secondsToNanos * 4,
    ]);

    const testValue = metric.testGetValue("aPing");
    assert.strictEqual(testValue?.count, 4);
    assert.ok(!!testValue?.sum, "The sum of the distribution should be greater than 0.");
  });

  it("converts time units to nanoseconds", function () {
    const expected = 86400000000000;

    interface TestCase {
      unit: TimeUnit;
      value: number;
    }

    const testCases: TestCase[] = [
      {
        unit: TimeUnit.Nanosecond,
        value: 86400000000000,
      },
      {
        unit: TimeUnit.Microsecond,
        value: 86400000000,
      },
      {
        unit: TimeUnit.Millisecond,
        value: 86400000,
      },
      {
        unit: TimeUnit.Second,
        value: 86400,
      },
      {
        unit: TimeUnit.Minute,
        value: 1440,
      },
      {
        unit: TimeUnit.Hour,
        value: 24,
      },
      {
        unit: TimeUnit.Day,
        value: 1,
      },
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = convertTimeUnitToNanos(testCase.value, testCase.unit);
      assert.strictEqual(result, expected);
    }
  });
});
