/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Glean from "glean";
import DatetimeMetricType, { DatetimeMetric } from "metrics/datetime";
import { Lifetime } from "metrics";

const sandbox = sinon.createSandbox();

describe("DatetimeMetric", function() {
  before(async function () {
    // Monkeypatch this function to have a deterministic return value anywhere in the world.
    sandbox.stub(Date.prototype, "getTimezoneOffset").callsFake(() => -300);
  });

  after(function () {
    sandbox.restore();
  });

  beforeEach(async function() {
    await Glean.testRestGlean();
  });

  it("datetime internal representation validation works as expected", function () {
    // Invalid objects
    assert.throws(() => new DatetimeMetric(undefined));
    assert.throws(() => new DatetimeMetric(null));
    assert.throws(() => new DatetimeMetric({}));
    assert.throws(() => new DatetimeMetric({ rubbish: "garbage" }));
    assert.throws(() => new DatetimeMetric({ rubbish: "garbage", timeUnit: "milliseconds", timezone: 0, date: "2021-01-04T16:37:21.828Z" }));
    assert.throws(() => new DatetimeMetric({  timezone: 0, date: "2021-01-04T16:37:21.828Z" }));

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

  it("attemping to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new DatetimeMetricType({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "millisecond");

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attemping to set when glean upload is disabled is a no-op", async function() {
    Glean.uploadEnabled = false;

    const metric = new DatetimeMetricType({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "millisecond");

    await metric.set();
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  describe("ping payload is correct", function() {
    it("nanosecond", async function () {
      const metric = new DatetimeMetricType({
        category: "aCategory",
        name: "aDatetimeMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      }, "nanosecond");

      await metric.set(new Date(1995, 5, 25, 8, 15, 45, 385));
      assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T08:15:45.385000000+05:00");

      const snapshot = await Glean.db.getPing("aPing", true);
      assert.deepStrictEqual(snapshot, {
        "datetime": {
          "aCategory.aDatetimeMetric": "1995-05-25T08:15:45.385000000+05:00"
        }
      });
    });

    it("microsecond", async function () {
      const metric = new DatetimeMetricType({
        category: "aCategory",
        name: "aDatetimeMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      }, "microsecond");

      await metric.set(new Date(1995, 5, 25, 8, 15, 45, 385));
      assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T08:15:45.385000+05:00");

      const snapshot = await Glean.db.getPing("aPing", true);
      assert.deepStrictEqual(snapshot, {
        "datetime": {
          "aCategory.aDatetimeMetric": "1995-05-25T08:15:45.385000+05:00"
        }
      });
    });

    it("millisecond", async function () {
      const metric = new DatetimeMetricType({
        category: "aCategory",
        name: "aDatetimeMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      }, "millisecond");

      await metric.set(new Date(1995, 5, 25, 8, 15, 45, 385));
      assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T08:15:45.385+05:00");

      const snapshot = await Glean.db.getPing("aPing", true);
      assert.deepStrictEqual(snapshot, {
        "datetime": {
          "aCategory.aDatetimeMetric": "1995-05-25T08:15:45.385+05:00"
        }
      });
    });

    it("second", async function () {
      const metric = new DatetimeMetricType({
        category: "aCategory",
        name: "aDatetimeMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      }, "second");

      await metric.set(new Date(1995, 5, 25, 8, 15, 45, 385));
      assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T08:15:45+05:00");

      const snapshot = await Glean.db.getPing("aPing", true);
      assert.deepStrictEqual(snapshot, {
        "datetime": {
          "aCategory.aDatetimeMetric": "1995-05-25T08:15:45+05:00"
        }
      });
    });

    it("minute", async function () {
      const metric = new DatetimeMetricType({
        category: "aCategory",
        name: "aDatetimeMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      }, "minute");

      await metric.set(new Date(1995, 5, 25, 8, 15, 45, 385));
      assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T08:15+05:00");

      const snapshot = await Glean.db.getPing("aPing", true);
      assert.deepStrictEqual(snapshot, {
        "datetime": {
          "aCategory.aDatetimeMetric": "1995-05-25T08:15+05:00"
        }
      });
    });

    it("hour", async function () {
      const metric = new DatetimeMetricType({
        category: "aCategory",
        name: "aDatetimeMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      }, "hour");

      await metric.set(new Date(1995, 5, 25, 8, 15, 45, 385));
      assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T08+05:00");

      const snapshot = await Glean.db.getPing("aPing", true);
      assert.deepStrictEqual(snapshot, {
        "datetime": {
          "aCategory.aDatetimeMetric": "1995-05-25T08+05:00"
        }
      });
    });

    it("day", async function () {
      const metric = new DatetimeMetricType({
        category: "aCategory",
        name: "aDatetimeMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      }, "day");

      await metric.set(new Date(1995, 5, 25, 8, 15, 45, 385));
      assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25+05:00");

      const snapshot = await Glean.db.getPing("aPing", true);
      assert.deepStrictEqual(snapshot, {
        "datetime": {
          "aCategory.aDatetimeMetric": "1995-05-25+05:00"
        }
      });
    });
  });

  it("set properly sets the value in all pings", async function() {
    const metric = new DatetimeMetricType({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "millisecond");

    await metric.set(new Date(1995, 5, 25, 8, 15, 45, 385));
    assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T08:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("twoPing"), "1995-05-25T08:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("threePing"), "1995-05-25T08:15:45.385+05:00");
  });
});
