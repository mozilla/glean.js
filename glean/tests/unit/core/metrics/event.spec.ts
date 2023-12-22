/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Glean from "../../../../src/core/glean";
import EventMetricType from "../../../../src/core/metrics/types/event";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import { ErrorType } from "../../../../src/core/error/error_type";
import { testResetGlean } from "../../../../src/core/testing";

describe("EventMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function() {
    testResetGlean(testAppId);
  });

  it("the API records to its storage engine", function () {
    const click = new EventMetricType({
      category: "ui",
      name: "click",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["object_id", "other"]);

    // Record two events of the same type, with a little delay.
    click.record({"object_id": "buttonA", "other": "foo"});
    click.record({"object_id": "buttonB", "other": "bar"});

    const snapshot = click.testGetValue();
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

  it("the API records when category is empty", function () {
    const click = new EventMetricType({
      category: "",
      name: "click",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["object_id"]);

    click.record({"object_id": "buttonA"});
    click.record({"object_id": "buttonB"});

    const snapshot = click.testGetValue();
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

  it("disabled events must not record data", function () {
    const click = new EventMetricType({
      category: "ui",
      name: "click",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: true
    });

    click.record();

    const snapshot = click.testGetValue();
    assert.strictEqual(snapshot, undefined);
  });

  it("events should not record when upload is disabled", function () {
    const click = new EventMetricType({
      category: "ui",
      name: "click",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["test_name"]);

    click.record({"test_name": "event1"});
    let snapshot = click.testGetValue();
    assert.strictEqual(snapshot?.length, 1);

    Glean.setUploadEnabled(false);
    click.record({"test_name": "event2"});
    snapshot = click.testGetValue();
    assert.strictEqual(snapshot, undefined);

    Glean.setUploadEnabled(true);
    click.record({"test_name": "event3"});
    snapshot = click.testGetValue();
    assert.strictEqual(snapshot?.length, 1);
  });

  it("long extra values record an error", function () {
    const metric = new EventMetricType({
      category: "telemetry",
      name: "test_event",
      sendInPings: ["store1", "store2"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["label"]);

    metric.record({ label: "01234567890".repeat(100) });
    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidOverflow), 1);
  });

  it("attempting to record with an invalid key index records an error", function () {
    const metric = new EventMetricType({
      category: "telemetry",
      name: "test_event",
      sendInPings: ["store1", "store2"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["label"]);

    metric.record({ nonRegisteredLabel: "01234567890" });
    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidValue), 1);
  });

  it("records properly without optional arguments", function () {
    const pings = ["store1", "store2"];

    const metric = new EventMetricType({
      category: "telemetry",
      name: "test_event_no_optional",
      sendInPings: pings,
      lifetime: Lifetime.Ping,
      disabled: false
    }, []);

    metric.record();

    for (const p of pings) {
      const events = metric.testGetValue(p);
      assert.ok(events);
      assert.strictEqual(1, events.length);
      assert.strictEqual("telemetry", events[0].category);
      assert.strictEqual("test_event_no_optional", events[0].name);
      assert.ok(!events[0].extra);
    }
  });

  it("records properly with optional arguments", function () {
    const pings = ["store1", "store2"];

    const metric = new EventMetricType({
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
      const events = metric.testGetValue(p);
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

  it("extra keys must be recorded and truncated if needed", function () {
    const testEvent = new EventMetricType({
      category: "ui",
      name: "testEvent",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["extra1", "truncatedExtra"]);

    const testValue = "LeanGleanByFrank";
    const extra = {
      "extra1": testValue,
      "truncatedExtra": testValue.repeat(50),
    };

    testEvent.record(extra);

    const recordedEvents = testEvent.testGetValue();
    assert.ok(recordedEvents);
    assert.strictEqual(1, recordedEvents.length);
    const event = recordedEvents[0];
    assert.strictEqual("ui", event.category);
    assert.strictEqual("testEvent", event.name);
    assert.ok(event.extra);
    assert.strictEqual(2, Object.keys(event.extra).length);
    assert.strictEqual(testValue, event.extra["extra1"]);
    assert.strictEqual(
      testValue.repeat(50).substr(0, 500),
      event.extra["truncatedExtra"]
    );
  });

  it("all types of event keys are recorded correctly", function () {
    const event = new EventMetricType<{
      "string"?: string,
      "boolean"?: boolean,
      "number"?: number
    }>({
      category: "test",
      name: "event",
      sendInPings: ["store1"],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["string", "boolean", "number"]);

    event.record({
      "string": "aString",
      "boolean": false,
      "number": 42
    });
    // Record again with incomplete extras
    event.record({
      "string": "twoString",
      "boolean": true,
    });
    // Record again without extras
    event.record();

    const snapshot = event.testGetValue();
    assert.ok(snapshot);
    assert.strictEqual(snapshot.length, 3);

    const extras1 = snapshot[0].extra;
    assert.ok(extras1);
    assert.strictEqual(extras1["string"], "aString");
    assert.strictEqual(extras1["boolean"], false);
    assert.strictEqual(extras1["number"], 42);

    const extras2 = snapshot[1].extra;
    assert.ok(extras2);
    assert.strictEqual(extras2["string"], "twoString");
    assert.strictEqual(extras2["boolean"], true);
    assert.strictEqual(extras2["number"], undefined);

    const extras3 = snapshot[2].extra;
    assert.ok(!extras3);
  });

  it("attempting to record a value of incorrect type records an error", function () {
    const metric = new EventMetricType({
      category: "telemetry",
      name: "test",
      sendInPings: [ "aPing" ],
      lifetime: Lifetime.Ping,
      disabled: false
    }, ["key1", "key2"]);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metric.record("not object");
    // Extra values may only be booleans, numbers or strings
    //
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    metric.record({ "key1": { "not": "valid" }});

    assert.strictEqual(metric.testGetNumRecordedErrors(ErrorType.InvalidType), 2);
    assert.strictEqual(metric.testGetValue(), undefined);
  });
});
