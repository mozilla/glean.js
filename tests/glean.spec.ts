/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import { CLIENT_INFO_STORAGE, KNOWN_CLIENT_ID } from "../src/constants";
import Glean from "glean";
import { Lifetime } from "metrics";
import StringMetricType from "metrics/types/string";

const GLOBAL_APPLICATION_ID = "org.mozilla.glean.test.app";
const sandbox = sinon.createSandbox();

describe("Glean", function() {
  beforeEach(async function() {
    await Glean.testResetGlean(GLOBAL_APPLICATION_ID);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("client_id and first_run_date are regenerated if cleared", async function() {
    await Glean["metricsDatabase"].clearAll();
    assert.strictEqual(
      await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE), undefined);
    assert.strictEqual(
      await Glean["coreMetrics"]["firstRunDate"].testGetValue(CLIENT_INFO_STORAGE), undefined);

    await Glean.testUninitialize();
    Glean.initialize(GLOBAL_APPLICATION_ID, true);
    assert.ok(await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE));
    assert.ok(await Glean["coreMetrics"]["firstRunDate"].testGetValue(CLIENT_INFO_STORAGE));
  });

  it("basic metrics should be cleared when upload is disabled", async function() {
    const pings = ["aPing", "twoPing", "threePing"];
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: pings,
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), "TEST VALUE");
    }

    Glean.setUploadEnabled(false);
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), undefined);
    }

    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), undefined);
    }

    Glean.setUploadEnabled(true);
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), undefined);
    }

    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), "TEST VALUE");
    }
  });

  it("first_run_date is managed correctly when toggling uploading", async function() {
    const originalFirstRunDate = await Glean["coreMetrics"]["firstRunDate"]
      .testGetValueAsString(CLIENT_INFO_STORAGE);

    Glean.setUploadEnabled(false);
    assert.strictEqual(
      await Glean["coreMetrics"]["firstRunDate"].testGetValueAsString(CLIENT_INFO_STORAGE),
      originalFirstRunDate
    );

    Glean.setUploadEnabled(true);
    assert.strictEqual(
      await Glean["coreMetrics"]["firstRunDate"].testGetValueAsString(CLIENT_INFO_STORAGE),
      originalFirstRunDate
    );
  });

  it("client_id is managed correctly when toggling uploading", async function() {
    const originalClientId = await Glean["coreMetrics"]["clientId"]
      .testGetValue(CLIENT_INFO_STORAGE);
    assert.ok(originalClientId);
    assert.ok(originalClientId !== KNOWN_CLIENT_ID);

    Glean.setUploadEnabled(false);
    assert.strictEqual(
      await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE),
      KNOWN_CLIENT_ID
    );

    Glean.setUploadEnabled(true);
    const newClientId = await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE);
    assert.ok(newClientId !== originalClientId);
    assert.ok(newClientId !== KNOWN_CLIENT_ID);
  });

  it("client_id is set to known value when uploading disabled at start", async function() {
    await Glean.testUninitialize();
    Glean.initialize(GLOBAL_APPLICATION_ID, false);
    assert.strictEqual(
      await Glean["coreMetrics"]["clientId"].testGetValue(CLIENT_INFO_STORAGE),
      KNOWN_CLIENT_ID
    );
  });

  it("client_id is set to random value when uploading enabled at start", async function() {
    Glean.setUploadEnabled(false);
    await Glean.testUninitialize();
    Glean.initialize(GLOBAL_APPLICATION_ID, true);
    const clientId = await Glean["coreMetrics"]["clientId"]
      .testGetValue(CLIENT_INFO_STORAGE);
    assert.ok(clientId);
    assert.ok(clientId !== KNOWN_CLIENT_ID);
  });

  it("enabling when already enabled is a no-op", async function() {
    const spy = sandbox.spy(Glean["coreMetrics"], "initialize");
    Glean.setUploadEnabled(true);
    // Wait for `setUploadEnabled` to be executed.
    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(spy.callCount, 0);
  });

  it("disabling when already disabled is a no-op", async function() {
    const spy = sandbox.spy(Glean["pingUploader"], "clearPendingPingsQueue");
    Glean.setUploadEnabled(false);
    Glean.setUploadEnabled(false);
    // Wait for `setUploadEnabled` to be executed both times.
    await Glean.dispatcher.testBlockOnQueue();
    assert.strictEqual(spy.callCount, 1);
  });

  it("initialization throws if applicationId is an empty string", async function() {
    await Glean.testUninitialize();
    try {
      Glean.initialize("", true);
      assert.ok(false);
    } catch {
      assert.ok(true);
    }
  });

  it("initialization throws if serverEndpoint is an invalida URL", async function() {
    await Glean.testUninitialize();
    try {
      Glean.initialize(GLOBAL_APPLICATION_ID, true, { serverEndpoint: "" });
      assert.ok(false);
    } catch {
      assert.ok(true);
    }
  });

  it("disabling upload should disable metrics recording", async function() {
    const pings = ["aPing", "twoPing", "threePing"];
    const metric = new StringMetricType({
      category: "aCategory",
      name: "aStringMetric",
      sendInPings: pings,
      lifetime: Lifetime.Ping,
      disabled: false
    });

    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), "TEST VALUE");
    }

    Glean.setUploadEnabled(false);
    metric.set("TEST VALUE");
    for (const ping of pings) {
      assert.strictEqual(await metric.testGetValue(ping), undefined);
    }
  });

  it("initializing twice is a no-op", async function() {
    await Glean.testUninitialize();
    Glean.initialize(GLOBAL_APPLICATION_ID, true);
    // initialize is dispatched, we must await on the queue being completed to assert things.
    await Glean.dispatcher.testBlockOnQueue();

    // This time it should not be called, which means upload should not be switched to `false`.
    Glean.initialize(GLOBAL_APPLICATION_ID, false);
    assert.ok(Glean.isUploadEnabled());
  });
});
