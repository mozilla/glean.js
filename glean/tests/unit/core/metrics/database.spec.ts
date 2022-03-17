/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Database, { generateReservedMetricIdentifiers } from "../../../../src/core/metrics/database";
import { InternalStringMetricType as StringMetricType, StringMetric } from "../../../../src/core/metrics/types/string";

import type { JSONObject, JSONValue } from "../../../../src/core/utils";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import { Context } from "../../../../src/core/context";
import { BooleanMetric } from "../../../../src/core/metrics/types/boolean";
import { testResetGlean } from "../../../../src/core/testing";

describe("MetricsDatabase", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await testResetGlean(testAppId);

    // These metric types are used throughout tests,
    // but is added directly on the database instead of creating it through new BooleanMetricType.
    //
    // In order for the database to be able to deserialize metrics of this type we need to
    // add it to the supported metrics map.
    Context.addSupportedMetric("boolean", BooleanMetric);
    Context.addSupportedMetric("string", StringMetric);
  });

  describe("record", function() {
    it("records to the correct place at the underlying store", async function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      await db.record(userMetric, new StringMetric("userValue"));
      assert.strictEqual(
        await db["userStore"].get(["aPing", "string", "user.aMetric"]),
        "userValue"
      );

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      await db.record(pingMetric, new StringMetric("pingValue"));
      assert.strictEqual(
        await db["pingStore"].get(["aPing", "string", "ping.aMetric"]),
        "pingValue"
      );

      const appMetric = new StringMetricType({
        category: "app",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      await db.record(appMetric, new StringMetric("appValue"));
      assert.strictEqual(
        await db["appStore"].get(["aPing", "string", "app.aMetric"]),
        "appValue"
      );
    });

    it("records at all the pings defined in a metric", async function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing", "otherPing", "oneMorePing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      await db.record(metric, new StringMetric("aValue"));
      const recorded1 = await db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded1, "aValue");
      const recorded2 = await db["appStore"].get(["otherPing", "string", "aMetric"]);
      assert.strictEqual(recorded2, "aValue");
      const recorded3 = await db["appStore"].get(["oneMorePing", "string", "aMetric"]);
      assert.strictEqual(recorded3, "aValue");
    });

    it("overwrites old value if necessary", async function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      await db.record(metric, new StringMetric("aValue"));
      await db.record(metric, new StringMetric("overwrittenValue"));
      const recorded = await db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded, "overwrittenValue");
    });

    it("doesn't record if metric is disabled", async function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: true
      });

      await db.record(metric, new StringMetric("aValue"));
      const recorded = await db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded, undefined);
    });
  });

  describe("transform", function() {
    it("transforms to the correct place at the underlying store", async function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      await db.transform(userMetric, (v?: JSONValue) => (
        v ? new StringMetric(`USER_${JSON.stringify(v)}`) : new StringMetric("USER")
      ));
      assert.strictEqual(
        await db["userStore"].get(["aPing", "string", "user.aMetric"]),
        "USER"
      );

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      await db.transform(pingMetric,(v?: JSONValue) => (
        v ? new StringMetric(`PING_${JSON.stringify(v)}`) : new StringMetric("PING")
      ));
      assert.strictEqual(
        await db["pingStore"].get(["aPing", "string", "ping.aMetric"]),
        "PING"
      );

      const appMetric = new StringMetricType({
        category: "app",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      await db.transform(appMetric, (v?: JSONValue) => (
        v ? new StringMetric(`APP_${JSON.stringify(v)}`) : new StringMetric("APP")
      ));
      assert.strictEqual(
        await db["appStore"].get(["aPing", "string", "app.aMetric"]),
        "APP"
      );
    });

    it("transforms at all the pings defined in a metric", async function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing", "otherPing", "oneMorePing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      await db.transform(metric, (v?: JSONValue) => (
        v ? new StringMetric(`EXTRA_${JSON.stringify(v)}`) : new StringMetric("EXTRA")
      ));
      const recorded1 = await db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded1, "EXTRA");
      const recorded2 = await db["appStore"].get(["otherPing", "string", "aMetric"]);
      assert.strictEqual(recorded2, "EXTRA");
      const recorded3 = await db["appStore"].get(["oneMorePing", "string", "aMetric"]);
      assert.strictEqual(recorded3, "EXTRA");
    });

    it("doesn't transform if metric is disabled", async function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: true
      });

      await db.transform(metric, (v?: JSONValue) => (
        v ? new StringMetric(`EXTRA_${JSON.stringify(v)}`) : new StringMetric("EXTRA")
      ));
      const recorded = await db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded, undefined);
    });
  });

  describe("getMetric", function() {
    it("gets correct metric from correct ping", async function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      await db.record(metric, new StringMetric("aValue"));
      assert.strictEqual(await db.getMetric("aPing", metric), "aValue");
    });

    it("doesn't error if trying to get a metric that hasn't been recorded yet", async function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      assert.strictEqual(await db.getMetric("aPing", metric), undefined);
    });

    it("deletes entry in case an unexpected value in encountered", async function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      await db["appStore"].update(
        ["aPing", "string", "aMetric"],
        () => ({ "out": "of place" })
      );

      assert.strictEqual(await db.getMetric("aPing", metric), undefined);
      assert.strictEqual(await db["appStore"].get(["aPing", "string", "aMetric"]), undefined);
    });
  });

  describe("getPingMetrics", function() {
    it("when incorrect data is found on the storage, it is deleted", async function() {
      const db = new Database();
      await db["appStore"].update(["aPing"], () => "not even an object");
      assert.strictEqual(await db.getPingMetrics("aPing", false), undefined);
      assert.strictEqual(await db["appStore"].get(["aPing"]), undefined);

      await db["appStore"].update(["aPing"], () => ({
        "string": "this should be an object"
      }));
      assert.strictEqual(await db.getPingMetrics("aPing", false), undefined);
      assert.deepStrictEqual(await db["appStore"].get(["aPing"]), {});

      await db["appStore"].update(["aPing"], () => ({
        "string": {
          "my.string": 1
        }
      }));
      assert.strictEqual(await db.getPingMetrics("aPing", false), undefined);
      assert.deepStrictEqual(await db["appStore"].get(["aPing"]), { "string": {} });

      await db["appStore"].update(["aPing"], () => ({
        "string": {
          "my.string": "a string"
        },
        "wrong": "very wrong"
      }));
      assert.deepStrictEqual(await db.getPingMetrics("aPing", false), {
        "string": {
          "my.string": "a string"
        }
      });
      assert.deepStrictEqual(await db["appStore"].get(["aPing"]),
        {
          "string": {
            "my.string": "a string"
          }
        });
    });

    it("getting a ping with metric from only one lifetime works correctly", async function() {
      const db = new Database();
      await db["appStore"].update(["aPing"], () => ({
        "string": {
          "string.one": "foo",
          "string.two": "bar",
          "string.three": "baz",
        },
        "boolean": {
          "this.is": true,
          "ping": false,
          "looks": true
        }
      }));

      assert.deepStrictEqual(await db.getPingMetrics("aPing", false), {
        "string": {
          "string.one": "foo",
          "string.two": "bar",
          "string.three": "baz",
        },
        "boolean": {
          "this.is": true,
          "ping": false,
          "looks": true
        }
      });
    });

    it("getting a ping with metric from multiple lifetimes works correctly", async function() {
      const db = new Database();
      await db["userStore"].update(["aPing"], () => ({
        "boolean": {
          "client_info.client_id": false,
        },
        "string": {
          "locale": "pt_BR"
        }
      }));
      await db["pingStore"].update(["aPing"], () => ({
        "string": {
          "string.one": "foo",
          "string.two": "bar",
          "string.three": "baz",
        },
        "boolean": {
          "this.is": true,
          "ping": false,
          "looks": true
        }
      }));
      await db["appStore"].update(["aPing"], () => ({
        "string": {
          "aaaaaand": "etc",
        },
      }));

      assert.deepStrictEqual(await db.getPingMetrics("aPing", false), {
        "boolean": {
          "client_info.client_id": false,
          "this.is": true,
          "ping": false,
          "looks": true
        },
        "string": {
          "locale": "pt_BR",
          "string.one": "foo",
          "string.two": "bar",
          "string.three": "baz",
          "aaaaaand": "etc",
        }
      });
    });

    it("ping lifetime data is cleared when clearPingLifetimeData is passed", async function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      await db.record(userMetric, new StringMetric("userValue"));

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "metric",
        sendInPings: ["aPing", "twoPing", "threePing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      await db.record(pingMetric, new StringMetric("pingValue"));

      const appMetric = new StringMetricType({
        category: "app",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      await db.record(appMetric, new StringMetric("appValue"));

      await db.getPingMetrics("aPing", true);
      assert.notDeepStrictEqual(await db["userStore"].get(), {});
      assert.deepStrictEqual(await db["pingStore"].get(), {
        "twoPing": {
          "string": {
            "ping.metric": "pingValue"
          }
        },
        "threePing": {
          "string": {
            "ping.metric": "pingValue"
          }
        }
      });
      assert.notDeepStrictEqual(await db["appStore"].get(), {});
    });

    it("reserved metrics are not added to snapshot", async function() {
      const db = new Database();
      const reservedMetric = new StringMetricType({
        ...generateReservedMetricIdentifiers("test"),
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      await db.record(reservedMetric, new StringMetric("reserved"));

      const nonReservedMetric = new StringMetricType({
        category: "ping",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      await db.record(nonReservedMetric, new StringMetric("not reserved"));

      const snapshot = await db.getPingMetrics("aPing", true);
      // Check that the non reserved metric was in the snapshot.
      assert.ok("ping.metric" in (snapshot?.string as JSONObject));
      // Check that no other metric was there.
      assert.strictEqual(Object.keys(snapshot?.string || {}).length, 1);
    });
  });

  describe("clear", function() {
    it("clear all stores works correctly", async function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      await db.record(userMetric, new StringMetric("userValue"));

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      await db.record(pingMetric, new StringMetric("pingValue"));

      const appMetric = new StringMetricType({
        category: "app",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      await db.record(appMetric, new StringMetric("appValue"));

      await db.clearAll();
      assert.deepStrictEqual(await db["userStore"].get(), undefined);
      assert.deepStrictEqual(await db["pingStore"].get(), undefined);
      assert.deepStrictEqual(await db["appStore"].get(), undefined);
    });

    it("clears separate stores correctly", async function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      await db.record(userMetric, new StringMetric("userValue"));

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      await db.record(pingMetric, new StringMetric("pingValue"));

      const appMetric = new StringMetricType({
        category: "app",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      await db.record(appMetric, new StringMetric("appValue"));

      await db.clear(Lifetime.User);
      assert.deepStrictEqual(await db["userStore"].get(), undefined);
      assert.notDeepStrictEqual(await db["pingStore"].get(), undefined);
      assert.notDeepStrictEqual(await db["appStore"].get(), undefined);
    });

    it("clears data from specific ping when specified", async function () {
      const metric = new StringMetricType({
        category: "some",
        name: "metric",
        sendInPings: ["aPing", "twoPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      await Context.metricsDatabase.record(metric, new StringMetric("value"));
      await Context.metricsDatabase.clear(Lifetime.Ping, "aPing");

      assert.strictEqual(await metric.testGetValue("aPing"), undefined);
      assert.strictEqual(await metric.testGetValue("twoPing"), "value");
    });
  });
});
