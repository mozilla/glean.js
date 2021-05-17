/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import { Context } from "../../../src/core/context";
import { ErrorType } from "../../../src/core/error/error_type";
import Glean from "../../../src/core/glean";
import { Lifetime } from "../../../src/core/metrics/lifetime";
import BooleanMetricType from "../../../src/core/metrics/types/boolean";
import CounterMetricType from "../../../src/core/metrics/types/counter";
import LabeledMetricType from "../../../src/core/metrics/types/labeled";
import StringMetricType from "../../../src/core/metrics/types/string";
import PingType from "../../../src/core/pings/ping_type";
import type { JSONObject } from "../../../src/core/utils";

const sandbox = sinon.createSandbox();

describe("LabeledMetric", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
    // Disable ping uploading for it not to interfere with this tests.
    sandbox.stub(Glean["pingUploader"], "triggerUpload").callsFake(() => Promise.resolve());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("test labeled counter type", async function() {
    const ping = new PingType({
      name: "test",
      includeClientId: true,
      sendIfEmpty: false,
    });

    const labeledCounterMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_counter_metric",
        sendInPings: ["test"],
        lifetime: Lifetime.Ping,
        disabled: false
      },
      CounterMetricType
    );

    labeledCounterMetric["label1"].add(1);
    labeledCounterMetric["label2"].add(2);

    assert.strictEqual(await labeledCounterMetric["label1"].testGetValue(), 1);
    assert.strictEqual(await labeledCounterMetric["label2"].testGetValue(), 2);

    // TODO: bug 1691033 will allow us to change the code below this point,
    // once a custom uploader for testing will be available.
    ping.submit();
    await Context.dispatcher.testBlockOnQueue();

    const storedPings = await Context.pingsDatabase["store"]._getWholeStore();
    assert.strictEqual(Object.keys(storedPings).length, 1);

    // TODO: bug 1682282 will validate the payload schema.

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stored: JSONObject = storedPings[Object.keys(storedPings)[0]] as JSONObject;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const payloadAsString = JSON.stringify(stored.payload);

    // Do the same checks again on the JSON structure
    assert.strict(
      payloadAsString.includes("\"labeled_counter\":{\"telemetry.labeled_counter_metric\":{\"label1\":1,\"label2\":2}}}")
    );
  });

  it("test __other__ label with predefined labels", async function() {
    const ping = new PingType({
      name: "test",
      includeClientId: true,
      sendIfEmpty: false,
    });

    const labeledCounterMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_counter_metric",
        sendInPings: ["test"],
        lifetime: Lifetime.Ping,
        disabled: false
      },
      CounterMetricType,
      ["foo", "bar", "baz"]
    );

    labeledCounterMetric["foo"].add(1);
    labeledCounterMetric["foo"].add(2);
    labeledCounterMetric["bar"].add(1);
    labeledCounterMetric["not_there"].add(1);
    labeledCounterMetric["also_not_there"].add(1);
    labeledCounterMetric["not_me"].add(1);

    assert.strictEqual(await labeledCounterMetric["foo"].testGetValue(), 3);
    assert.strictEqual(await labeledCounterMetric["bar"].testGetValue(), 1);
    assert.strictEqual(await labeledCounterMetric["baz"].testGetValue(), undefined);
    // The rest all lands in the __other__ bucket
    assert.strictEqual(await labeledCounterMetric["not_there"].testGetValue(), 3);

    // TODO: bug 1691033 will allow us to change the code below this point,
    // once a custom uploader for testing will be available.
    ping.submit();
    await Context.dispatcher.testBlockOnQueue();

    const storedPings = await Context.pingsDatabase["store"]._getWholeStore();
    assert.strictEqual(Object.keys(storedPings).length, 1);

    // TODO: bug 1682282 will validate the payload schema.

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stored: JSONObject = storedPings[Object.keys(storedPings)[0]] as JSONObject;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const payloadAsString = JSON.stringify(stored.payload);

    // Do the same checks again on the JSON structure
    assert.strict(
      payloadAsString.includes("\"labeled_counter\":{\"telemetry.labeled_counter_metric\":{\"foo\":3,\"bar\":1,\"__other__\":3}}}")
    );
  });

  it("test __other__ label without predefined labels", async function() {
    const labeledCounterMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_counter_metric",
        sendInPings: ["test"],
        lifetime: Lifetime.Ping,
        disabled: false
      },
      CounterMetricType
    );

    for (let i = 0; i <= 20; i++) {
      labeledCounterMetric[`label_${i}`].add(1);
    }
    // Go back and record in one of the real labels again.
    labeledCounterMetric["label_0"].add(1);

    assert.strictEqual(await labeledCounterMetric["label_0"].testGetValue(), 2);
    for (let i = 1; i <= 15; i++) {
      assert.strictEqual(await labeledCounterMetric[`label_${i}`].testGetValue(), 1);
    }
    assert.strictEqual(await labeledCounterMetric["__other__"].testGetValue(), 5);
  });

  it("test __other__ label without predefined labels before Glean initialization", async function() {
    const labeledCounterMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_counter_metric",
        sendInPings: ["metrics"],
        lifetime: Lifetime.Application,
        disabled: false
      },
      CounterMetricType
    );

    // Make sure Glean isn't initialized, so that tasks get enqueued.
    await Glean.testUninitialize();

    for (let i = 0; i <= 20; i++) {
      labeledCounterMetric[`label_${i}`].add(1);
    }
    // Go back and record in one of the real labels again.
    labeledCounterMetric["label_0"].add(1);

    await Glean.testInitialize("gleanjs.unit.test", true);

    assert.strictEqual(await labeledCounterMetric["label_0"].testGetValue(), 2);
    for (let i = 1; i <= 15; i++) {
      assert.strictEqual(await labeledCounterMetric[`label_${i}`].testGetValue(), 1);
    }
    assert.strictEqual(await labeledCounterMetric["__other__"].testGetValue(), 5);
  });

  it("Ensure invalid labels on labeled counter go to __other__", async function() {
    const labeledCounterMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_counter_metric",
        sendInPings: ["metrics"],
        lifetime: Lifetime.Application,
        disabled: false
      },
      CounterMetricType
    );

    labeledCounterMetric["notSnakeCase"].add(1);
    labeledCounterMetric[""].add(1);
    labeledCounterMetric["with/slash"].add(1);
    labeledCounterMetric["this_string_has_more_than_thirty_characters"].add(1);

    assert.strictEqual(await labeledCounterMetric["__other__"].testGetValue(), 4);
    assert.strictEqual(
      await labeledCounterMetric["__other__"].testGetNumRecordedErrors(ErrorType.InvalidLabel),
      4
    );
  });

  it("Ensure invalid labels on labeled boolean go to __other__", async function() {
    const labeledBooleanMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_boolean_metric",
        sendInPings: ["metrics"],
        lifetime: Lifetime.Application,
        disabled: false
      },
      BooleanMetricType
    );

    labeledBooleanMetric["notSnakeCase"].set(true);
    labeledBooleanMetric[""].set(true);
    labeledBooleanMetric["with/slash"].set(true);
    labeledBooleanMetric["this_string_has_more_than_thirty_characters"].set(true);

    assert.strictEqual(await labeledBooleanMetric["__other__"].testGetValue(), true);
    assert.strictEqual(
      await labeledBooleanMetric["__other__"].testGetNumRecordedErrors(ErrorType.InvalidLabel),
      4
    );
  });

  it("Ensure invalid labels on labeled string go to __other__", async function() {
    const labeledStringMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_string_metric",
        sendInPings: ["metrics"],
        lifetime: Lifetime.Application,
        disabled: false
      },
      StringMetricType
    );

    labeledStringMetric["notSnakeCase"].set("foo");
    labeledStringMetric[""].set("foo");
    labeledStringMetric["with/slash"].set("foo");
    labeledStringMetric["this_string_has_more_than_thirty_characters"].set("foo");

    assert.strictEqual(await labeledStringMetric["__other__"].testGetValue(), "foo");
    assert.strictEqual(
      await labeledStringMetric["__other__"].testGetNumRecordedErrors(ErrorType.InvalidLabel),
      4
    );
  });

  it("test labeled string metric type", async function() {
    const ping = new PingType({
      name: "test",
      includeClientId: true,
      sendIfEmpty: false,
    });

    const labeledStringMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_string_metric",
        sendInPings: ["test"],
        lifetime: Lifetime.Application,
        disabled: false
      },
      StringMetricType
    );

    labeledStringMetric["label1"].set("foo");
    labeledStringMetric["label2"].set("bar");

    assert.strictEqual(await labeledStringMetric["label1"].testGetValue(), "foo");
    assert.strictEqual(await labeledStringMetric["label2"].testGetValue(), "bar");
    assert.strictEqual(await labeledStringMetric["__other__"].testGetValue(), undefined);
    assert.strictEqual(
      await labeledStringMetric["__other__"].testGetNumRecordedErrors(ErrorType.InvalidLabel),
      0
    );

    // TODO: bug 1691033 will allow us to change the code below this point,
    // once a custom uploader for testing will be available.
    ping.submit();
    await Context.dispatcher.testBlockOnQueue();

    const storedPings = await Context.pingsDatabase["store"]._getWholeStore();
    assert.strictEqual(Object.keys(storedPings).length, 1);

    // TODO: bug 1682282 will validate the payload schema.

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stored: JSONObject = storedPings[Object.keys(storedPings)[0]] as JSONObject;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const payloadAsString = JSON.stringify(stored.payload);

    // Do the same checks again on the JSON structure
    assert.strict(
      payloadAsString.includes("\"labeled_string\":{\"telemetry.labeled_string_metric\":{\"label1\":\"foo\",\"label2\":\"bar\"}}}")
    );
  });

  it("test labeled boolean metric type", async function() {
    const ping = new PingType({
      name: "test",
      includeClientId: true,
      sendIfEmpty: false,
    });

    const metric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_bool",
        sendInPings: ["test"],
        lifetime: Lifetime.Application,
        disabled: false
      },
      BooleanMetricType
    );

    metric["label1"].set(false);
    metric["label2"].set(true);

    let value = await metric["label1"].testGetValue();
    assert.strictEqual(value, false);

    value = await metric["label2"].testGetValue();
    assert.strictEqual(value, true);

    // TODO: bug 1691033 will allow us to change the code below this point,
    // once a custom uploader for testing will be available.
    ping.submit();
    await Context.dispatcher.testBlockOnQueue();

    const storedPings = await Context.pingsDatabase["store"]._getWholeStore();
    assert.strictEqual(Object.keys(storedPings).length, 1);

    // TODO: bug 1682282 will validate the payload schema.

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stored: JSONObject = storedPings[Object.keys(storedPings)[0]] as JSONObject;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const payloadAsString = JSON.stringify(stored.payload);

    // Do the same checks again on the JSON structure
    assert.strict(
      payloadAsString.includes("\"labeled_boolean\":{\"telemetry.labeled_bool\":{\"label1\":false,\"label2\":true}}}")
    );
  });

  it("dynamic labels regex mismatch", async function() {
    const labeledCounterMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_counter_metric",
        sendInPings: ["metrics"],
        lifetime: Lifetime.Application,
        disabled: false
      },
      CounterMetricType
    );

    const labelsNotMatching = [
      "notSnakeCase",
      "",
      "with/slash",
      "1.not_fine",
      "this.$isnotfine",
      "-.not_fine",
      "this.is_not_fine.2",
    ];

    for (const label of labelsNotMatching) {
      labeledCounterMetric[label].add(1);
    }

    assert.strictEqual(await labeledCounterMetric["__other__"].testGetValue(), labelsNotMatching.length);
  });

  it("dynamic labels regex allowed", async function() {
    const labeledCounterMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_counter_metric",
        sendInPings: ["metrics"],
        lifetime: Lifetime.Application,
        disabled: false
      },
      CounterMetricType
    );

    const labelsMatching = [
      "this.is.fine",
      "this_is_fine_too",
      "this.is_still_fine",
      "thisisfine",
      "_.is_fine",
      "this.is-fine",
      "this-is-fine",
    ];

    for (const label of labelsMatching) {
      labeledCounterMetric[label].add(1);
      assert.strictEqual(await labeledCounterMetric[label].testGetValue(), 1);
    }

    assert.strictEqual(await labeledCounterMetric["__other__"].testGetValue(), undefined);
  });

  it("seen labels get reloaded across initializations", async function() {
    const labeledCounterMetric = new LabeledMetricType(
      {
        category: "telemetry",
        name: "labeled_metric",
        sendInPings: ["metrics"],
        lifetime: Lifetime.Ping,
        disabled: false
      },
      CounterMetricType
    );

    for (let i = 1; i <= 16; i++) {
      const label = `label_${i}`;
      labeledCounterMetric[label].add(1);
      assert.strictEqual(await labeledCounterMetric[label].testGetValue(), 1);
    }

    // Reset glean without clearing the storage.
    await Glean.testUninitialize();
    await Glean.testInitialize("gleanjs.unit.test", true);

    // Try to store another label.
    labeledCounterMetric["new_label"].add(40);

    // Check that the old data is still there.
    for (let i = 1; i <= 16; i++) {
      assert.strictEqual(await labeledCounterMetric[`label_${i}`].testGetValue(), 1);
    }
    // The new label lands in the __other__ bucket, due to too many labels.
    assert.strictEqual(await labeledCounterMetric["__other__"].testGetValue(), 40);
  });
});
