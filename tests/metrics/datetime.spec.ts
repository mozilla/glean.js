/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Glean from "glean";
import DatetimeMetric from "metrics/datetime";
import { Lifetime } from "metrics";

describe("DatetimeMetric", function() {
  beforeEach(async function() {
    await Glean.resetGlean();

    // Monkeypatch the `getTimezoneOffset` function
    // to have a deterministic return value anywhere in the world.
    sinon.stub(Date.prototype, "getTimezoneOffset").callsFake(() => -300);
  });

  afterEach(function () {
    // Undo the monkeypatch.
    //
    // Need to @ts-ignore here because the `getTimezoneOffset` type
    // doesn't mention anything about the `restore` method,
    //
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    Date.prototype.getTimezoneOffset.restore();
  });

  it("attemping to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new DatetimeMetric({
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

    const metric = new DatetimeMetric({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "millisecond");

    await metric.set();
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const metric = new DatetimeMetric({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "millisecond");

    await metric.set(new Date(1995, 4, 25, 8, 15, 45, 385));
    assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T06:15:45.385+05:00");

    const snapshot = await Glean.db.getPing("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "datetime": {
        "aCategory.aDatetimeMetric": "1995-05-25T06:15:45.385+05:00"
      }
    });
  });

  it("set properly sets the value in all pings", async function() {
    const metric = new DatetimeMetric({
      category: "aCategory",
      name: "aDatetimeMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, "millisecond");

    await metric.set(new Date(1995, 4, 25, 8, 15, 45, 385));
    assert.strictEqual(await metric.testGetValueAsString("aPing"), "1995-05-25T06:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("twoPing"), "1995-05-25T06:15:45.385+05:00");
    assert.strictEqual(await metric.testGetValueAsString("threePing"), "1995-05-25T06:15:45.385+05:00");
  });
});
