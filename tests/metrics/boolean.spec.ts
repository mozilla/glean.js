/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Glean from "glean";
import BooleanMetric from "metrics/boolean";
import { Lifetime } from "metrics";

describe("BooleanMetric", function() {
  it("attemping to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const metric = new BooleanMetric({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(await metric.testGetValue("aPing"), undefined);
  });

  it("attemping to set when glean upload is disabled is a no-op", async function() {
    Glean.uploadEnabled = false;

    const metric = new BooleanMetric({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set(true);
    assert.strictEqual(await metric.testGetValue("aPing"), undefined);

    // Reset upload enabled state, not to inerfere with other tests.
    // TODO: Remove this after Bug 1682769 is resolved.
    Glean.uploadEnabled = true;
  });

  it("ping payload is correct", async function() {
    const metric = new BooleanMetric({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set(true);
    assert.strictEqual(await metric.testGetValue("aPing"), true);

    const snapshot = await Glean.db.getPing("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "boolean": {
        "aCategory.aBooleanMetric": true
      }
    });
  });

  it("set properly sets the value in all pings", async function() {
    const metric = new BooleanMetric({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set(true);
    assert.strictEqual(await metric.testGetValue("aPing"), true);
    assert.strictEqual(await metric.testGetValue("twoPing"), true);
    assert.strictEqual(await metric.testGetValue("threePing"), true);
  });
});
