/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import Glean from "../../../../src/core/glean";

import { Lifetime } from "../../../../src/core/metrics/lifetime";
import EventsDatabase, { RecordedEvent } from "../../../../src/core/metrics/events_database";
import EventMetricType from "../../../../src/core/metrics/types/event";
import type { JSONObject } from "../../../../src/core/utils";

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
    const data = await db.getPingEvents("test-unknown-ping", true);

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
    let snapshot = await db.getPingEvents("store1", false);
    assert.strictEqual(snapshot, undefined);

    await db.record(metric, new RecordedEvent(
      "telemetry",
      "test_event_clear",
      1000,
    ));

    // Take a first snapshot and clear the recorded content.
    snapshot = await db.getPingEvents("store1", true);
    assert.ok(snapshot != undefined);

    // If we snapshot a second time, the store must be empty.
    const empty_snapshot = await db.getPingEvents("store1", false);
    assert.strictEqual(empty_snapshot, undefined);

    const store2 = await db.getPingEvents("store2", false);
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
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    await db.record(metric, new RecordedEvent(
      metric.category,
      metric.name,
      1000,
    ));

    await db.record(metric, new RecordedEvent(
      metric.category,
      metric.name,
      100,
    ));

    await db.record(metric, new RecordedEvent(
      metric.category,
      metric.name,
      10000,
    ));

    const snapshot = await db.getPingEvents("store1", true);
    assert.ok(snapshot);
    assert.strictEqual(3, snapshot.length);
    assert.strictEqual(0, (snapshot[0] as JSONObject)["timestamp"]);
    assert.strictEqual(900, (snapshot[1] as JSONObject)["timestamp"]);
    assert.strictEqual(9900, (snapshot[2] as JSONObject)["timestamp"]);
  });
});
