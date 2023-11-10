/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Database from "../../../../src/core/metrics/database";
import { generateReservedMetricIdentifiers } from "../../../../src/core/metrics/database";
import { InternalStringMetricType as StringMetricType, StringMetric } from "../../../../src/core/metrics/types/string";

import type { JSONObject, JSONValue } from "../../../../src/core/utils";
import { Lifetime } from "../../../../src/core/metrics/lifetime";
import { Context } from "../../../../src/core/context";
import { BooleanMetric } from "../../../../src/core/metrics/types/boolean";
import { testResetGlean } from "../../../../src/core/testing";

describe("MetricsDatabase", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function() {
    testResetGlean(testAppId);

    // These metric types are used throughout tests,
    // but is added directly on the database instead of creating it through new BooleanMetricType.
    //
    // In order for the database to be able to deserialize metrics of this type we need to
    // add it to the supported metrics map.
    Context.addSupportedMetric("boolean", BooleanMetric);
    Context.addSupportedMetric("string", StringMetric);
  });

  describe("record", function() {
    it("records to the correct place at the underlying store", function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      db.record(userMetric, new StringMetric("userValue"));
      assert.strictEqual(
        db["userStore"].get(["aPing", "string", "user.aMetric"]),
        "userValue"
      );

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      db.record(pingMetric, new StringMetric("pingValue"));
      assert.strictEqual(
        db["pingStore"].get(["aPing", "string", "ping.aMetric"]),
        "pingValue"
      );

      const appMetric = new StringMetricType({
        category: "app",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      db.record(appMetric, new StringMetric("appValue"));
      assert.strictEqual(
        db["appStore"].get(["aPing", "string", "app.aMetric"]),
        "appValue"
      );
    });

    it("records at all the pings defined in a metric", function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing", "otherPing", "oneMorePing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      db.record(metric, new StringMetric("aValue"));
      const recorded1 = db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded1, "aValue");
      const recorded2 = db["appStore"].get(["otherPing", "string", "aMetric"]);
      assert.strictEqual(recorded2, "aValue");
      const recorded3 = db["appStore"].get(["oneMorePing", "string", "aMetric"]);
      assert.strictEqual(recorded3, "aValue");
    });

    it("overwrites old value if necessary", function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      db.record(metric, new StringMetric("aValue"));
      db.record(metric, new StringMetric("overwrittenValue"));
      const recorded = db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded, "overwrittenValue");
    });

    it("doesn't record if metric is disabled", function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: true
      });

      db.record(metric, new StringMetric("aValue"));
      const recorded = db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded, undefined);
    });
  });

  describe("transform", function() {
    it("transforms to the correct place at the underlying store", function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      db.transform(userMetric, (v?: JSONValue) => (
        v ? new StringMetric(`USER_${JSON.stringify(v)}`) : new StringMetric("USER")
      ));
      assert.strictEqual(
        db["userStore"].get(["aPing", "string", "user.aMetric"]),
        "USER"
      );

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      db.transform(pingMetric,(v?: JSONValue) => (
        v ? new StringMetric(`PING_${JSON.stringify(v)}`) : new StringMetric("PING")
      ));
      assert.strictEqual(
        db["pingStore"].get(["aPing", "string", "ping.aMetric"]),
        "PING"
      );

      const appMetric = new StringMetricType({
        category: "app",
        name: "aMetric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      db.transform(appMetric, (v?: JSONValue) => (
        v ? new StringMetric(`APP_${JSON.stringify(v)}`) : new StringMetric("APP")
      ));
      assert.strictEqual(
        db["appStore"].get(["aPing", "string", "app.aMetric"]),
        "APP"
      );
    });

    it("transforms at all the pings defined in a metric", function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing", "otherPing", "oneMorePing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      db.transform(metric, (v?: JSONValue) => (
        v ? new StringMetric(`EXTRA_${JSON.stringify(v)}`) : new StringMetric("EXTRA")
      ));
      const recorded1 = db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded1, "EXTRA");
      const recorded2 = db["appStore"].get(["otherPing", "string", "aMetric"]);
      assert.strictEqual(recorded2, "EXTRA");
      const recorded3 = db["appStore"].get(["oneMorePing", "string", "aMetric"]);
      assert.strictEqual(recorded3, "EXTRA");
    });

    it("doesn't transform if metric is disabled", function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: true
      });

      db.transform(metric, (v?: JSONValue) => (
        v ? new StringMetric(`EXTRA_${JSON.stringify(v)}`) : new StringMetric("EXTRA")
      ));
      const recorded = db["appStore"].get(["aPing", "string", "aMetric"]);
      assert.strictEqual(recorded, undefined);
    });
  });

  describe("getMetric", function() {
    it("gets correct metric from correct ping", function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      db.record(metric, new StringMetric("aValue"));
      assert.strictEqual(db.getMetric("aPing", metric), "aValue");
    });

    it("doesn't error if trying to get a metric that hasn't been recorded yet", function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      assert.strictEqual(db.getMetric("aPing", metric), undefined);
    });

    it("deletes entry in case an unexpected value in encountered", function() {
      const db = new Database();
      const metric = new StringMetricType({
        name: "aMetric",
        category: "",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });

      db["appStore"].update(
        ["aPing", "string", "aMetric"],
        () => ({ "out": "of place" })
      );

      assert.strictEqual(db.getMetric("aPing", metric), undefined);
      assert.strictEqual(db["appStore"].get(["aPing", "string", "aMetric"]), undefined);
    });
  });

  describe("getPingMetrics", function() {
    it("when incorrect data is found on the storage, it is deleted", function() {
      const db = new Database();
      db["appStore"].update(["aPing"], () => "not even an object");
      assert.strictEqual(db.getPingMetrics("aPing", false), undefined);
      assert.strictEqual(db["appStore"].get(["aPing"]), undefined);

      db["appStore"].update(["aPing"], () => ({
        "string": "this should be an object"
      }));
      assert.strictEqual(db.getPingMetrics("aPing", false), undefined);
      assert.deepStrictEqual(db["appStore"].get(["aPing"]), {});

      db["appStore"].update(["aPing"], () => ({
        "string": {
          "my.string": 1
        }
      }));
      assert.strictEqual(db.getPingMetrics("aPing", false), undefined);
      assert.deepStrictEqual(db["appStore"].get(["aPing"]), { "string": {} });

      db["appStore"].update(["aPing"], () => ({
        "string": {
          "my.string": "a string"
        },
        "wrong": "very wrong"
      }));
      assert.deepStrictEqual(db.getPingMetrics("aPing", false), {
        "string": {
          "my.string": "a string"
        }
      });
      assert.deepStrictEqual(db["appStore"].get(["aPing"]),
        {
          "string": {
            "my.string": "a string"
          }
        });
    });

    it("getting a ping with metric from only one lifetime works correctly", function() {
      const db = new Database();
      db["appStore"].update(["aPing"], () => ({
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

      assert.deepStrictEqual(db.getPingMetrics("aPing", false), {
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

    it("getting a ping with metric from multiple lifetimes works correctly", function() {
      const db = new Database();
      db["userStore"].update(["aPing"], () => ({
        "boolean": {
          "client_info.client_id": false,
        },
        "string": {
          "locale": "pt_BR"
        }
      }));
      db["pingStore"].update(["aPing"], () => ({
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
      db["appStore"].update(["aPing"], () => ({
        "string": {
          "aaaaaand": "etc",
        },
      }));

      assert.deepStrictEqual(db.getPingMetrics("aPing", false), {
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

    it("ping lifetime data is cleared when clearPingLifetimeData is passed", function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      db.record(userMetric, new StringMetric("userValue"));

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "metric",
        sendInPings: ["aPing", "twoPing", "threePing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      db.record(pingMetric, new StringMetric("pingValue"));

      const appMetric = new StringMetricType({
        category: "app",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      db.record(appMetric, new StringMetric("appValue"));

      db.getPingMetrics("aPing", true);
      assert.notDeepStrictEqual(db["userStore"].get(), {});
      assert.deepStrictEqual(db["pingStore"].get(), {
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
      assert.notDeepStrictEqual(db["appStore"].get(), {});
    });

    it("reserved metrics are not added to snapshot", function() {
      const db = new Database();
      const reservedMetric = new StringMetricType({
        ...generateReservedMetricIdentifiers("test"),
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      db.record(reservedMetric, new StringMetric("reserved"));

      const nonReservedMetric = new StringMetricType({
        category: "ping",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      db.record(nonReservedMetric, new StringMetric("not reserved"));

      const snapshot = db.getPingMetrics("aPing", true);
      // Check that the non reserved metric was in the snapshot.
      assert.ok("ping.metric" in (snapshot?.string as JSONObject));
      // Check that no other metric was there.
      assert.strictEqual(Object.keys(snapshot?.string || {}).length, 1);
    });
  });

  describe("clear", function() {
    it("clear all stores works correctly", function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      db.record(userMetric, new StringMetric("userValue"));

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      db.record(pingMetric, new StringMetric("pingValue"));

      const appMetric = new StringMetricType({
        category: "app",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      db.record(appMetric, new StringMetric("appValue"));

      db.clearAll();
      assert.deepStrictEqual(db["userStore"].get(), undefined);
      assert.deepStrictEqual(db["pingStore"].get(), undefined);
      assert.deepStrictEqual(db["appStore"].get(), undefined);
    });

    it("clears separate stores correctly", function() {
      const db = new Database();
      const userMetric = new StringMetricType({
        category: "user",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.User,
        disabled: false
      });
      db.record(userMetric, new StringMetric("userValue"));

      const pingMetric = new StringMetricType({
        category: "ping",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      db.record(pingMetric, new StringMetric("pingValue"));

      const appMetric = new StringMetricType({
        category: "app",
        name: "metric",
        sendInPings: ["aPing"],
        lifetime: Lifetime.Application,
        disabled: false
      });
      db.record(appMetric, new StringMetric("appValue"));

      db.clear(Lifetime.User);
      assert.deepStrictEqual(db["userStore"].get(), undefined);
      assert.notDeepStrictEqual(db["pingStore"].get(), undefined);
      assert.notDeepStrictEqual(db["appStore"].get(), undefined);
    });

    it("clears data from specific ping when specified", function () {
      const metric = new StringMetricType({
        category: "some",
        name: "metric",
        sendInPings: ["aPing", "twoPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      Context.metricsDatabase.record(metric, new StringMetric("value"));
      Context.metricsDatabase.clear(Lifetime.Ping, "aPing");

      assert.strictEqual(metric.testGetValue("aPing"), undefined);
      assert.strictEqual(metric.testGetValue("twoPing"), "value");
    });
  });
});
