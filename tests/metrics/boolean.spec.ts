/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Glean from "glean";
import BooleanMetric from "metrics/boolean";
import { Lifetime } from "metrics";

describe("BooleanMetric", function() {
  it("attemping to get the value of a metric that hasn't been recorded doesn't error", async function() {
    const glean = new Glean();
    const metric = new BooleanMetric({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    assert.strictEqual(await metric.testGetValue(glean, "aPing"), undefined);
  });

  it("attemping to set when glean upload is disabled is a no-op", async function() {
    const glean = new Glean();
    glean.uploadEnabled = false;

    const metric = new BooleanMetric({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set(glean, true);
    assert.strictEqual(await metric.testGetValue(glean, "aPing"), undefined);
  });

  it("ping payload is correct", async function() {
    const glean = new Glean();
    const metric = new BooleanMetric({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set(glean, true);
    assert.strictEqual(await metric.testGetValue(glean, "aPing"), true);

    const snapshot = await glean.db.getPing("aPing", true);
    assert.deepStrictEqual(snapshot, {
      "boolean": {
        "aCategory.aBooleanMetric": true
      }
    });
  });

  it("set properly sets the value in all ping", async function() {
    const glean = new Glean();
    const metric = new BooleanMetric({
      category: "aCategory",
      name: "aBooleanMetric",
      sendInPings: ["aPing", "twoPing", "threePing"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await metric.set(glean, true);
    assert.strictEqual(await metric.testGetValue(glean, "aPing"), true);
    assert.strictEqual(await metric.testGetValue(glean, "twoPing"), true);
    assert.strictEqual(await metric.testGetValue(glean, "threePing"), true);
  });
});
