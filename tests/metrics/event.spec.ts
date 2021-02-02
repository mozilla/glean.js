/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { performance } from "perf_hooks";
import assert from "assert";

import Glean from "glean";
import EventMetricType from "metrics/types/event";
import { Lifetime } from "metrics";

// A test event type that exclusively overrides the
// monotonic timer.
class TestEventMetricType extends EventMetricType {
  getMonotonicNow(): number {
    return Math.round(performance.now() / 1000);
  }
} 

describe("EventMetric", function() {
  beforeEach(async function() {
    await Glean.testResetGlean("something something");
  });

  it("the API records to its storage engine", async function () {
    const click = new TestEventMetricType({
      category: "ui",
      name: "click",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["object_id", "other"]);

    // Record two events of the same type, with a little delay.
    click.record({"object_id": "buttonA", "other": "foo"});
    click.record({"object_id": "buttonB", "other": "bar"});

    const snapshot = await click.testGetValue();
    assert.ok(snapshot);

    const firstEvent = snapshot.find((e) => e.extra && e.extra["object_id"] == "buttonA");
    assert.ok(firstEvent);
    assert.strictEqual(firstEvent.category, "ui");
    assert.strictEqual(firstEvent.name, "click");
    assert.ok(firstEvent.extra);
    assert.strictEqual(firstEvent.extra["other"], "foo");

    const secondEvent = snapshot.find((e) => e.extra && e.extra["object_id"] == "buttonB");
    assert.ok(secondEvent);
    assert.strictEqual(secondEvent.category, "ui");
    assert.strictEqual(secondEvent.name, "click");
    assert.ok(secondEvent.extra);
    assert.strictEqual(secondEvent.extra["other"], "bar");

    assert.ok(firstEvent.timestamp <= secondEvent.timestamp);
  });

  it("the API records when category is empty", async function () {
    const click = new TestEventMetricType({
      category: "",
      name: "click",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["object_id"]);

    click.record({"object_id": "buttonA"});
    click.record({"object_id": "buttonB"});

    const snapshot = await click.testGetValue();
    assert.ok(snapshot);

    const firstEvent = snapshot.find((e) => e.extra && e.extra["object_id"] == "buttonA");
    assert.ok(firstEvent);
    assert.strictEqual(firstEvent.category, "");
    assert.strictEqual(firstEvent.name, "click");

    const secondEvent = snapshot.find((e) => e.extra && e.extra["object_id"] == "buttonB");
    assert.ok(secondEvent);
    assert.strictEqual(secondEvent.category, "");
    assert.strictEqual(secondEvent.name, "click");

    assert.ok(firstEvent.timestamp <= secondEvent.timestamp);
  });

  it("disabled events must not record data", async function () {
    const click = new TestEventMetricType({
      category: "ui",
      name: "click",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: true
    });

    click.record();

    const snapshot = await click.testGetValue();
    assert.strictEqual(snapshot, undefined);
  });

  it.skip("bug 1690307: events should not record when upload is disabled", async function () {
    const click = new TestEventMetricType({
      category: "ui",
      name: "click",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["test_name"]);

    click.record({"test_name": "event1"});
    let snapshot = await click.testGetValue();
    assert.strictEqual(snapshot?.length, 1);

    Glean.setUploadEnabled(false);
    click.record({"test_name": "event2"});
    snapshot = await click.testGetValue();
    assert.strictEqual(snapshot, undefined);

    Glean.setUploadEnabled(true);
    click.record({"test_name": "event3"});
    snapshot = await click.testGetValue();
    assert.strictEqual(snapshot?.length, 1);
  });

  it.skip("bug 1690253: flush queued events on startup");
  it.skip("bug 1690253: flush queued events on startup and correctly handle pre init events");
  it.skip("bug 1682574: long extra values record an error");
  it.skip("bug 1690301: overdue events are submitted in registered custom pings");
  it.skip("bug 1690301: overdue events are discarded if ping is not registered");

  it("records properly without optional arguments", async function () {
    const pings = ["store1", "store2"];
  
    const metric = new TestEventMetricType({
      category: "telemetry",
      name: "test_event_no_optional",
      sendInPings: pings,
      lifetime: Lifetime.Ping,
      disabled: false
    }, []);

    metric.record();

    for (const p of pings) {
      const events = await metric.testGetValue(p);
      assert.ok(events);
      assert.strictEqual(1, events.length);
      assert.strictEqual("telemetry", events[0].category);
      assert.strictEqual("test_event_no_optional", events[0].name);
      assert.ok(!events[0].extra);
    }
  });

  it("records properly with optional arguments", async function () {
    const pings = ["store1", "store2"];
  
    const metric = new TestEventMetricType({
      category: "telemetry",
      name: "test_event_with_optional",
      sendInPings: pings,
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["key1", "key2"]);

    const extras = {
      "key1": "value1",
      "key2": "value2",
    };
    metric.record(extras);

    for (const p of pings) {
      const events = await metric.testGetValue(p);
      assert.ok(events);
      assert.strictEqual(1, events.length);
      assert.strictEqual("telemetry", events[0].category);
      assert.strictEqual("test_event_with_optional", events[0].name);
      assert.ok(events[0].extra);
      assert.strictEqual(2, Object.keys(events[0].extra).length);
      assert.strictEqual("value1", events[0].extra["key1"]);
      assert.strictEqual("value2", events[0].extra["key2"]);
    }
  });

  it.skip("bug 1690253: send an event ping when it fills up");

  it("extra keys must be recorded and truncated if needed", async function () {
    const testEvent = new TestEventMetricType({
      category: "ui",
      name: "testEvent",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["extra1", "truncatedExtra"]);

    const testValue = "LeanGleanByFrank";
    const extra = {
      "extra1": testValue,
      "truncatedExtra": testValue.repeat(10),
    };

    testEvent.record(extra);

    const recordedEvents = await testEvent.testGetValue();
    assert.ok(recordedEvents);
    assert.strictEqual(1, recordedEvents.length);
    const event = recordedEvents[0];
    assert.strictEqual("ui", event.category);
    assert.strictEqual("testEvent", event.name);
    assert.ok(event.extra);
    assert.strictEqual(2, Object.keys(event.extra).length);
    assert.strictEqual(testValue, event.extra["extra1"]);
    assert.strictEqual(
      testValue.repeat(10).substr(0, 100),
      event.extra["truncatedExtra"]
    );
  });
});
