/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Glean from "../../../src/core/glean";
import DatetimeMetricType from "../../../src/core/metrics/types/datetime";
import { DatetimeMetric } from "../../../src/core/metrics/types/datetime_metric";
import TimeUnit from "../../../src/core/metrics/time_unit";
import { Lifetime } from "../../../src/core/metrics/lifetime";

const sandbox = sinon.createSandbox();

describe("DatetimeMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  afterEach(function () {
    sandbox.restore();
  });

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  it("datetime internal representation validation works as expected", function () {
    // Invalid objects
    assert.throws(() => new DatetimeMetric(undefined));
    assert.throws(() => new DatetimeMetric(null));
    assert.throws(() => new DatetimeMetric({}));
    assert.throws(() => new DatetimeMetric({ rubbish: "garbage" }));
    assert.throws(() => new DatetimeMetric({ rubbish: "garbage", timeUnit: "milliseconds", timezone: 0, date: "2021-01-04T16:37:21.828Z" }));
    assert.throws(() => new DatetimeMetric({ timezone: 0, date: "2021-01-04T16:37:21.828Z" }));

    // Invalid time units
    assert.throws(() => new DatetimeMetric({ timeUnit: "garbage", timezone: 0, date: "2021-01-04T16:37:21.828Z" }));
    assert.throws(() => new DatetimeMetric({ timeUnit: null, timezone: 0, date: "2021-01-04T16:37:21.828Z" }));
    assert.throws(() => new DatetimeMetric({ timeUnit: "hour" }));

    // Invalid timezones
    assert.throws(() => new DatetimeMetric({ timeUnit: "hour", timezone: "garbage", date: "2021-01-04T16:37:21.828Z" }));
    assert.throws(() => new DatetimeMetric({ timeUnit: "hour", date: "2021-01-04T16:37:21.828Z" }));
    assert.throws(() => new DatetimeMetric({ timezone: -300 }));

    // Invalid dates
    assert.throws(() => new DatetimeMetric({ timeUnit: "hour", timezone: -300, date: 300 }));
    assert.throws(() => new DatetimeMetric({ timeUnit: "hour", date: "aaaaaaaaaaaaaaaaaaaaaaaa" }));
    assert.throws(() => new DatetimeMetric({ date: "2021-01-04T16:37:21.828Z" }));

    // Valid values
    assert.doesNotThrow(() => new DatetimeMetric({ timeUnit: "millisecond", timezone: -300, date: "2021-01-04T16:37:21.828Z" }));
    assert.doesNotThrow(() => new DatetimeMetric({ timeUnit: "hour", timezone: 300, date: "2021-01-04T16:00:00.000Z" }));
  });

  it("attempting to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new DatetimeMetricType({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "millisecond");

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attempting to set when glean upload is disabled is a no-op", async function() {
    Glean.setUploadEnabled(false);

    const metric = new DatetimeMetricType({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "millisecond");

    metric.set();
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    // Monkeypatch this functions to have a deterministic return value anywhere in the world.
    sandbox.stub(Date.prototype, "getTimezoneOffset").callsFake(() => -300);
    sandbox.stub(Date.prototype, "toISOString").callsFake(() => "1995-05-25T03:15:45.385Z");

    const metric = new DatetimeMetricType({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "minute");

    metric.set(new Date(1995, 4, 25, 8, 15, 45, 385));
    assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T08:15+05:00");

    const snapshot = await Glean.metricsDatabase.getPingMetrics("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "datetime": {
        "aCategory.aDatetimeMetric": "1995-05-25T08:15+05:00"
      }
    });
  });

  it("set properly sets the value in all pings", async function() {
    // Monkeypatch this functions to have a deterministic return value anywhere in the world.
    sandbox.stub(Date.prototype, "getTimezoneOffset").callsFake(() => -300);
    sandbox.stub(Date.prototype, "toISOString")
      .onFirstCall().returns("1995-05-25T03:15:45.385Z")
      .onSecondCall().returns("1895-05-25T03:15:45.385Z")
      .onThirdCall().returns("2995-05-25T03:15:45.385Z");

    const metric = new DatetimeMetricType({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "millisecond");

    metric.set(new Date(1995, 4, 25, 8, 15, 45, 385));
    assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T08:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("twoPing"), "1995-05-25T08:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("threePing"), "1995-05-25T08:15:45.385+05:00");

    // A date prior to the UNIX epoch
    metric.set(new Date(1895, 4, 25, 8, 15, 45, 385));
    assert.strictEqual(await metric.testGetValueAsString("aPing"), "1895-05-25T08:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("twoPing"), "1895-05-25T08:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("threePing"), "1895-05-25T08:15:45.385+05:00");

    // A date following 2038 (the extent of signed 32-bits after UNIX epoch)
    metric.set(new Date(2995, 4, 25, 8, 15, 45, 385));
    assert.strictEqual(await metric.testGetValueAsString("aPing"), "2995-05-25T08:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("twoPing"), "2995-05-25T08:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("threePing"), "2995-05-25T08:15:45.385+05:00");
  });

  it("truncation works", async function() {
    // Monkeypatch this functions to have a deterministic return value anywhere in the world.
    sandbox.stub(Date.prototype, "getTimezoneOffset").callsFake(() => -300);
    sandbox.stub(Date.prototype, "toISOString").callsFake(() => "1985-07-03T07:09:14.001Z");

    const testCases = [
      {
        unit: TimeUnit.Nanosecond,
        expected: "1985-07-03T12:09:14.001000000+05:00",
      },
      {
        unit: TimeUnit.Microsecond,
        expected: "1985-07-03T12:09:14.001000+05:00",
      },
      {
        unit: TimeUnit.Millisecond,
        expected: "1985-07-03T12:09:14.001+05:00",
      },
      {
        unit: TimeUnit.Second,
        expected: "1985-07-03T12:09:14+05:00",
      },
      {
        unit: TimeUnit.Minute,
        expected: "1985-07-03T12:09+05:00",
      },
      {
        unit: TimeUnit.Hour,
        expected: "1985-07-03T12+05:00",
      },
      {
        unit: TimeUnit.Day,
        expected: "1985-07-03+05:00",
      },
    ];

    const date = new Date(1985, 6, 3, 12, 9, 14, 1);
    for (const testCase of testCases) {
      const metric = new DatetimeMetricType({
        category: "aCategory",
        name: "aDatetimeMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      }, testCase.unit);

      metric.set(date);
      assert.strictEqual(await metric.testGetValueAsString("aPing"), testCase.expected);
    }
  });

  it("get from different timezone than recording timezone keeps the original time intact", async function() {
    // Monkeypatch this functions to have a deterministic return value anywhere in the world.
    sandbox.stub(Date.prototype, "getTimezoneOffset").callsFake(() => -300);

    const metric = new DatetimeMetricType({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, TimeUnit.Millisecond);

    const concreteMetric = new DatetimeMetric({
      timeUnit: TimeUnit.Millisecond,
      timezone: 60,
      date: "2021-01-07T14:41:26.312Z"
    });
    await Glean.metricsDatabase.record(metric, concreteMetric);

    // 1. The monkeypatched timezone it -300 (+05:00)
    // 2. The timezone manually set on the metric above is 60 (-01:00)
    // 3. `date` is in UTC
    // 4. This means that the real time at the time of recording is 13:41
    const recorded = await metric.testGetValueAsString("aPing");
    assert.strictEqual(recorded, "2021-01-07T13:41:26.312-01:00");
  });
});
