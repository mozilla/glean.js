/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import Glean from "../../../../src/core/glean";

import { Lifetime } from "../../../../src/core/metrics/lifetime";
import EventsDatabase, { RecordedEvent } from "../../../../src/core/metrics/events_database";
import EventMetricType from "../../../../src/core/metrics/types/event";
import type { JSONObject } from "../../../../src/core/utils";
import { Context } from "../../../../src/core/context";

describe("EventsDatabase", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  it("stable serialization", function () {
    const event_empty = new RecordedEvent(
      "cat",
      "name",
      2,
      // Intentional, no extra.
    );

    const event_data = new RecordedEvent(
      "cat",
      "name",
      2,
      {
        "a key": "a value",
      }
    );

    const event_empty_json = RecordedEvent.toJSONObject(event_empty);
    const event_data_json = RecordedEvent.toJSONObject(event_data);

    assert.deepStrictEqual(event_empty, RecordedEvent.fromJSONObject(event_empty_json));
    assert.deepStrictEqual(event_data, RecordedEvent.fromJSONObject(event_data_json));
  });

  it("deserialize existing data", function () {
    const event_empty_json = {
      "category": "cat",
      "extra": undefined,
      "name": "name",
      "timestamp": 2,
    };

    const event_data_json = {
      "category": "cat",
      "extra": {
        "a key": "a value"
      },
      "name": "name",
      "timestamp": 2,
    };

    const event_empty = RecordedEvent.fromJSONObject(event_empty_json);
    const event_data = RecordedEvent.fromJSONObject(event_data_json);

    assert.deepStrictEqual(
      event_empty_json,
      RecordedEvent.toJSONObject(event_empty)
    );
    assert.deepStrictEqual(event_data_json, RecordedEvent.toJSONObject(event_data));
  });

  // Note: "does not record if upload is disabled" was not ported from Rust. We
  // are only checking for upload being enabled in the metric type itself, to
  // reduce coupling across the components.

  it("getPingMetrics returns undefined if nothing is recorded", async function () {
    const db = new EventsDatabase(Glean.platform.Storage);
    const data = await db.getPingEvents("test-unknown-ping", true, new Date());

    assert.strictEqual(data, undefined);
  });

  it("getPingMetrics correctly clears the store", async function () {
    const db = new EventsDatabase(Glean.platform.Storage);

    const metric = new EventMetricType({
      category: "telemetry",
      name: "test_event_clear",
      sendInPings: ["store1", "store2"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    // We didn't record anything yet, so we don't expect anything to be
    // stored.
    let snapshot = await db.getPingEvents("store1", false, new Date());
    assert.strictEqual(snapshot, undefined);

    await db.record(metric.disabled, metric.sendInPings, new RecordedEvent(
      "telemetry",
      "test_event_clear",
      1000,
    ));

    // Take a first snapshot and clear the recorded content.
    snapshot = await db.getPingEvents("store1", true, new Date());
    assert.ok(snapshot != undefined);

    // If we snapshot a second time, the store must be empty.
    const empty_snapshot = await db.getPingEvents("store1", false, new Date());
    assert.strictEqual(empty_snapshot, undefined);

    const store2 = await db.getPingEvents("store2", false, new Date());
    for (const events of [snapshot, store2]) {
      assert.ok(events != undefined);
      assert.strictEqual(1, events.length);
      const e = events[0] as JSONObject;
      assert.strictEqual("telemetry", e["category"]);
      assert.strictEqual("test_event_clear", e["name"]);
      assert.strictEqual(e["extra"], undefined);
    }
  });

  it("getPingMetrics sorts the timestamps", async function () {
    const db = new EventsDatabase(Glean.platform.Storage);

    const metric = new EventMetricType({
      category: "telemetry",
      name: "test_event_timestamp",
      sendInPings: ["events"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await db.record(metric.disabled, metric.sendInPings, new RecordedEvent(
      metric.category,
      metric.name,
      1000,
    ));

    await db.record(metric.disabled, metric.sendInPings, new RecordedEvent(
      metric.category,
      metric.name,
      100,
    ));

    await db.record(metric.disabled, metric.sendInPings, new RecordedEvent(
      metric.category,
      metric.name,
      10000,
    ));

    const snapshot = await db.getPingEvents("events", true, new Date());
    assert.ok(snapshot);
    assert.strictEqual(3, snapshot.length);
    assert.strictEqual(0, (snapshot[0] as JSONObject)["timestamp"]);
    assert.strictEqual(900, (snapshot[1] as JSONObject)["timestamp"]);
    assert.strictEqual(9900, (snapshot[2] as JSONObject)["timestamp"]);
  });

  it("glean.restarted events are properly injected when initializing", async function () {
    // Initialize the database and inject some events.
    const db = new EventsDatabase(Glean.platform.Storage);
    await db.initialize();

    // Intentionally clear the DB to remove any injection.
    await db.clearAll();

    const stores = ["store1", "store2"];

    // Record some events.
    const event = new EventMetricType({
      category: "test",
      name: "event_injection",
      sendInPings: stores,
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await db.record(event.disabled, event.sendInPings, new RecordedEvent(
      event.category,
      event.name,
      1000,
    ));

    // Simulate a restart and use the new DB to check for injected events.
    const db2 = new EventsDatabase(Glean.platform.Storage);
    await db2.initialize();

    for (const store of stores) {
      const snapshot = await db2.getPingEvents(store, true, new Date());
      assert.ok(snapshot);
      assert.strictEqual(2, snapshot.length);
      assert.strictEqual("test", (snapshot[0] as JSONObject)["category"]);
      assert.strictEqual("event_injection", (snapshot[0] as JSONObject)["name"]);
      assert.strictEqual("glean", (snapshot[1] as JSONObject)["category"]);
      assert.strictEqual("restarted", (snapshot[1] as JSONObject)["name"]);
    }
  });

  it("events stitching happens for custom pings with events", async function () {
    // Clear any events from previous tests.
    const rawStorage = new Glean.platform.Storage("events");
    await rawStorage.delete([]);
    assert.deepStrictEqual({}, await rawStorage._getWholeStore());

    // Initialize the database and inject some events.
    const db = new EventsDatabase(Glean.platform.Storage);
    await db.initialize();

    const stores = ["store1", "store2"];

    // Record an initial event.
    await db.record(false, stores, new RecordedEvent("test", "run1", 1000));

    // Simulate a first restart: move the clock forward by one minute.
    Context.startTime.setTime(Context.startTime.getTime() + 1000 * 60);
    const db2 = new EventsDatabase(Glean.platform.Storage);
    await db2.initialize();

    await db2.record(false, stores, new RecordedEvent("test", "run2", 1000));

    // Simulate a another restart: move the clock forward by one minute.
    Context.startTime.setTime(Context.startTime.getTime() + 1000* 60);
    const db3 = new EventsDatabase(Glean.platform.Storage);
    await db3.initialize();

    await db3.record(false, stores, new RecordedEvent("test", "run3", 1000));

    for (const store of stores) {
      const snapshot = await db2.getPingEvents(store, true, new Date());
      assert.ok(snapshot);
      assert.strictEqual(5, snapshot.length);

      // Make sure timestamps are strictly increasing.
      let prevTime = 0;
      for (const event of snapshot) {
        const e = RecordedEvent.fromJSONObject(event as JSONObject);
        assert.ok(e.timestamp > prevTime);
        prevTime = e.timestamp;
      }

      assert.strictEqual("test", (snapshot[0] as JSONObject)["category"]);
      assert.strictEqual("run1", (snapshot[0] as JSONObject)["name"]);
      assert.strictEqual("glean", (snapshot[1] as JSONObject)["category"]);
      assert.strictEqual("restarted", (snapshot[1] as JSONObject)["name"]);
    }
  });

  it("internal extra properties are removed from the recorded events", async function () {
    // Clear any events from previous tests.
    const rawStorage = new Glean.platform.Storage("events");
    await rawStorage.delete([]);
    assert.deepStrictEqual({}, await rawStorage._getWholeStore());

    // Initialize the database and inject some events.
    const db = new EventsDatabase(Glean.platform.Storage);
    await db.initialize();

    const testEvent = new RecordedEvent("test", "run1", 10, {
      "gleanExecutionCounter": "1",
      "gleanStartupDate": "<date>"
    });
    assert.strictEqual(testEvent.withoutReservedExtras().extra, undefined);

    // Record an initial event.
    await db.record(false, ["store1"], testEvent);

    const snapshot = await db.getPingEvents("store1", true, new Date());
    assert.ok(snapshot);
    assert.strictEqual(1, snapshot.length);

    const e = RecordedEvent.fromJSONObject(snapshot[0] as JSONObject);
    assert.strictEqual(e.extra, undefined);
  });
});
