/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import type { SinonStub } from "sinon";
import { testResetGlean, testRestartGlean } from "../../../../src/core/testing";
import TimingDistributionMetricType, {
  TimingDistributionMetric,
} from "../../../../src/core/metrics/types/timing_distribution";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import TimeUnit from "../../../../src/core/metrics/time_unit";
import Glean from "../../../../src/core/glean";
import { convertTimeUnitToNanos } from "../../../../src/core/utils";

const sandbox = sinon.createSandbox();

describe("TimingDistributionMetric", function () {
  const testAppId = `gleanjs.test.${this.title}`;
  let fakeNow: SinonStub;

  beforeEach(async function () {
    await testResetGlean(testAppId);
    fakeNow =
      typeof performance === "undefined"
        ? sandbox.stub(Date, "now")
        : sandbox.stub(performance, "now");
  });

  afterEach(function () {
    sandbox.restore();
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
    assert.doesNotThrow(
      () =>
        new TimingDistributionMetric({
          100: 1,
          200: 2,
        })
    );
  });

  it("cancelling a metric", async function () {
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

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attempting to start/accumulate when glean upload is disable is a no-op", async function () {
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

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("timing distribution is started correctly", async function () {
    fakeNow.onCall(0).callsFake(() => 0);
    fakeNow.onCall(1).callsFake(() => 100);

    const metric = new TimingDistributionMetricType(
      {
        category: "aCategory",
        disabled: false,
        lifetime: Lifetime.Ping,
        name: "aTimingDistribution",
        sendInPings: ["aPing", "twoPing", "threePing"],
      },
      TimeUnit.Nanosecond
    );

    for (let i = 0; i < 4; i++) {
      const id = metric.start();
      metric.stopAndAccumulate(id);
    }

    const testValue = await metric.testGetValue("aPing");

    assert.strictEqual(Object.keys(testValue?.values || []).length, 4);
    assert.ok(testValue?.sum || 0 > 0, "The sum of the distribution should be greater than 0.");
  });

  it("timing distribution is persisted through restart", async function () {
    fakeNow.onCall(0).callsFake(() => 0);
    fakeNow.onCall(1).callsFake(() => 100);

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

    const testValue = await metric.testGetValue("aPing");
    assert.strictEqual(Object.keys(testValue?.values || []).length, 1);
    assert.ok(testValue?.sum || 0 > 0, "The sum of the distribution should be greater than 0.");

    await testRestartGlean();

    const testValue2 = await metric.testGetValue("aPing");
    assert.strictEqual(Object.keys(testValue2?.values || []).length, 1);
    assert.ok(testValue2?.sum || 0 > 0, "The sum of the distribution should be greater than 0.");
  });

  it("unique IDs are persisted through restarts", async function () {
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
    await testRestartGlean();
    const id2 = metric.start();

    assert.notEqual(id1, id2);
  });

  it("value accumulated when upload is not enabled gets removed", async function () {
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
    Glean.setUploadEnabled(false);
    metric.stopAndAccumulate(id1);

    const id2 = metric.start();
    Glean.setUploadEnabled(true);
    metric.stopAndAccumulate(id2);

    const testValue = await metric.testGetValue("aPing");
    assert.equal(Object.keys(testValue?.values || {}).length, 1);
  });

  it("multiple timers can be started, stopped, and cancelled in any order", async function () {
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

    const testValue = await metric.testGetValue("aPing");
    assert.equal(Object.keys(testValue?.values || {}).length, 2);
  });

  it("recording APIs properly sets the value in all pings", async function () {
    fakeNow.onCall(0).callsFake(() => 0);
    fakeNow.onCall(1).callsFake(() => 100);

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

    const testValueA = await metric.testGetValue("aPing");
    assert.strictEqual(Object.keys(testValueA?.values || []).length, 1);
    assert.ok(testValueA?.sum || 0 > 0, "The sum of the distribution should be greater than 0.");

    const testValueB = await metric.testGetValue("bPing");
    assert.strictEqual(Object.keys(testValueB?.values || []).length, 1);
    assert.ok(testValueB?.sum || 0 > 0, "The sum of the distribution should be greater than 0.");

    const testValueC = await metric.testGetValue("cPing");
    assert.strictEqual(Object.keys(testValueC?.values || []).length, 1);
    assert.ok(testValueC?.sum || 0 > 0, "The sum of the distribution should be greater than 0.");
  });

  it("recording multiple timings", async function () {
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

    const testValue = await metric.testGetValue("aPing");
    assert.strictEqual(Object.keys(testValue?.values || []).length, 4);
    assert.ok(testValue?.sum || 0 > 0, "The sum of the distribution should be greater than 0.");
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

  it("converts different time units to nanoseconds", function () {
    const units = [
      TimeUnit.Nanosecond,
      TimeUnit.Microsecond,
      TimeUnit.Millisecond,
      TimeUnit.Second,
      TimeUnit.Minute,
      TimeUnit.Hour,
      TimeUnit.Day,
    ];

    for (let i = 0; i < units.length; i++) {
      const metric = new TimingDistributionMetricType(
        {
          category: "aCategory",
          disabled: false,
          lifetime: Lifetime.Ping,
          name: "aTimingDistribution",
          sendInPings: ["aPing"],
        },
        units[i]
      );

      const id = metric.start();
      metric.stopAndAccumulate(id);
      // TODO
      // need to figure out how to validate this
    }
  });
});
