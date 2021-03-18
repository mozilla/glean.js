/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import PingType from "../../../src/core/pings";
import CounterMetricType from "../../../src/core/metrics/types/counter";
import { Lifetime } from "../../../src/core/metrics";
import Glean from "../../../src/core/glean";

const sandbox = sinon.createSandbox();

/**
 * Submits a ping and waits for the dispatcher queue to be completed.
 *
 * @param ping The ping to submit.
 */
async function submitSync(ping: PingType): Promise<void> {
  ping.submit();
  // TODO: Drop this whole approach once Bug 1691033 is resolved.
  await Glean.dispatcher.testBlockOnQueue();
}

describe("PingType", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  afterEach(function () {
    sandbox.restore();
  });

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  it("collects and stores ping on submit", async function () {
    // Disable ping uploading for it not to interfere with this tests.
    sandbox.stub(Glean["pingUploader"], "triggerUpload").callsFake(() => Promise.resolve());

    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    const counter = new CounterMetricType({
      category: "aCategory",
      name: "aCounterMetric",
      sendInPings: ["custom"],
      lifetime: Lifetime.Ping,
      disabled: false
    });
    counter.add();

    await submitSync(ping);
    const storedPings = await Glean.pingsDatabase["store"]._getWholeStore();
    assert.strictEqual(Object.keys(storedPings).length, 1);
  });

  it("empty pings with send if emtpy flag are submitted", async function () {
    // Disable ping uploading for it not to interfere with this tests.
    sandbox.stub(Glean["pingUploader"], "triggerUpload").callsFake(() => Promise.resolve());

    const ping1 = new PingType({
      name: "ping1",
      includeClientId: true,
      sendIfEmpty: false,
    });
    const ping2 = new PingType({
      name: "ping2",
      includeClientId: true,
      sendIfEmpty: true,
    });

    await submitSync(ping1);
    let storedPings = await Glean.pingsDatabase["store"]._getWholeStore();
    assert.strictEqual(Object.keys(storedPings).length, 0);

    await submitSync(ping2);
    storedPings = await Glean.pingsDatabase["store"]._getWholeStore();
    assert.strictEqual(Object.keys(storedPings).length, 1);
  });

  it("no pings are submitted if upload is disabled", async function() {
    Glean.setUploadEnabled(false);

    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    await submitSync(ping);
    const storedPings = await Glean.pingsDatabase["store"]._getWholeStore();
    assert.strictEqual(Object.keys(storedPings).length, 0);
  });

  it("no pings are submitted if Glean has not been initialized", async function() {
    await Glean.testUninitialize();

    const ping = new PingType({
      name: "custom",
      includeClientId: true,
      sendIfEmpty: false,
    });
    await submitSync(ping);
    const storedPings = await Glean.pingsDatabase["store"]._getWholeStore();
    assert.strictEqual(Object.keys(storedPings).length, 0);
  });
});
