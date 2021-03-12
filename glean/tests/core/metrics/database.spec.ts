/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Database, { isValidInternalMetricsRepresentation } from "../../../src/core/metrics/database";
import { Lifetime } from "../../../src/core/metrics";
import StringMetricType, { StringMetric } from "../../../src/core/metrics/types/string";
import { JSONValue } from "../../../src/core/utils";
import Glean from "../../../src/core/glean";

describe("MetricsDatabase", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
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
    it("isValidInternalMetricsRepresentation validates correctly", function() {
      // Invalids
      assert.strictEqual(false, isValidInternalMetricsRepresentation("not even an object"));
      assert.strictEqual(false, isValidInternalMetricsRepresentation({ 1: "an array-like object in not a ping!" }));
      assert.strictEqual(false, isValidInternalMetricsRepresentation({
        "aPing": {
          "string": {
            "too.nested": "not quite"
          }
        }
      }));
      assert.strictEqual(false, isValidInternalMetricsRepresentation({ "string": "almost!" }));
      // Valids
      assert.strictEqual(true, isValidInternalMetricsRepresentation({ "string": {} }));
      assert.strictEqual(true, isValidInternalMetricsRepresentation({ "string": { "there.we": "go" } }));
      assert.strictEqual(true, isValidInternalMetricsRepresentation({
        "string": {
          "string.one": "foo",
          "string.two": "bar",
          "string.three": "baz",
        }
      }));
      assert.strictEqual(true, isValidInternalMetricsRepresentation({
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
      assert.strictEqual(true, isValidInternalMetricsRepresentation({}));
    });

    it("when incorrect data is found on the storage, it is deleted", async function() {
      const db = new Database();
      await db["appStore"].update(["aPing"], () => "not even a string");
      assert.strictEqual(await db.getPingMetrics("aPing", false), undefined);
      assert.strictEqual(await db["appStore"].get(["aPing"]), undefined);
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
      assert.notDeepStrictEqual(await db["userStore"]._getWholeStore(), {});
      assert.deepStrictEqual(await db["pingStore"]._getWholeStore(), {
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
      assert.notDeepStrictEqual(await db["appStore"]._getWholeStore(), {});
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
      assert.deepStrictEqual(await db["userStore"]._getWholeStore(), {});
      assert.deepStrictEqual(await db["pingStore"]._getWholeStore(), {});
      assert.deepStrictEqual(await db["appStore"]._getWholeStore(), {});
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
      assert.deepStrictEqual(await db["userStore"]._getWholeStore(), {});
      assert.notDeepStrictEqual(await db["pingStore"]._getWholeStore(), {});
      assert.notDeepStrictEqual(await db["appStore"]._getWholeStore(), {});
    });

    it("clears data from specific ping when specified", async function () {
      const metric = new StringMetricType({
        category: "some",
        name: "metric",
        sendInPings: ["aPing", "twoPing"],
        lifetime: Lifetime.Ping,
        disabled: false
      });
      await Glean.metricsDatabase.record(metric, new StringMetric("value"));
      await Glean.metricsDatabase.clear(Lifetime.Ping, "aPing");

      assert.strictEqual(await metric.testGetValue("aPing"), undefined);
      assert.strictEqual(await metric.testGetValue("twoPing"), "value");
    });
  });
});
