/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Database, { Observer, isValidPingInternalRepresentation } from "../../../src/core/pings/database";
import Glean from "../../../src/core/glean";

describe("PingsDatabase", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  describe("record", function () {
    it("records correctly to the correct place at the underlying storage", async function() {
      const db = new Database(Glean.platform.Storage);
      const path = "some/random/path/doesnt/matter";
      const identifier = "THE IDENTIFIER";
      const payload = {
        ping_info: {
          seq: 1,
          start_time: "2020-01-11+01:00",
          end_time: "2020-01-12+01:00",
        },
        client_info: {
          telemetry_sdk_build: "32.0.0"
        }
      };
      await db.recordPing(path, identifier, payload);
      assert.deepStrictEqual(await db["store"].get([identifier]), {
        path, payload
      });
  
      const headers = { "X-Debug-ID": "test" };
      const otherIdentifier = "THE OTHER IDENTIFIER";
      await db.recordPing(path, otherIdentifier, payload, headers);
      assert.deepStrictEqual(await db["store"].get([otherIdentifier]), {
        path, payload, headers
      });
  
      assert.strictEqual(Object.keys(await db["store"]._getWholeStore()).length, 2);
    });

    it("observer is notified when a new ping is added to the database", async function() {
      let wasNotified = false;
      const identifier = "THE IDENTIFIER";
      const observer: Observer = {
        update(id: string): void {
          wasNotified = true;
          assert.strictEqual(id, identifier);
        }
      };
  
      const db = new Database(Glean.platform.Storage);
      db.attachObserver(observer);
      const path = "some/random/path/doesnt/matter";

      const payload = {
        ping_info: {
          seq: 1,
          start_time: "2020-01-11+01:00",
          end_time: "2020-01-12+01:00",
        },
        client_info: {
          telemetry_sdk_build: "32.0.0"
        }
      };
      await db.recordPing(path, identifier, payload);
      assert.ok(wasNotified);
    });
  });

  describe("get", function () {
    it("isValidPingInternalRepresentation validates correctly", function () {
      // Invalid values
      assert.strictEqual(isValidPingInternalRepresentation({}), false);
      assert.strictEqual(isValidPingInternalRepresentation({ path: "some/path" }), false);
      assert.strictEqual(isValidPingInternalRepresentation({ payload: {} }), false);
      assert.strictEqual(isValidPingInternalRepresentation({ payload: "not an object", path: "some/path" }), false);
      assert.strictEqual(isValidPingInternalRepresentation({ payload: {}, path: 1234 }), false);
      assert.strictEqual(isValidPingInternalRepresentation({ headers: {} }), false);
      assert.strictEqual(isValidPingInternalRepresentation({ payload: {}, path: "some/path", headers: "not an object" }), false);

      // Valid values
      assert.strictEqual(isValidPingInternalRepresentation({ payload: {}, path: "some/path", headers: {} }), true);
      assert.strictEqual(isValidPingInternalRepresentation({ payload: {}, path: "some/path" }), true);
    });

    it("when incorrect data is found on the storage it is deleted", async function () {
      const db = new Database(Glean.platform.Storage);
      const identifier = "THE IDENTIFIER";
      const path = "some/random/path/doesnt/matter";
      const payload = {
        ping_info: {
          seq: 1,
          start_time: "2020-01-11+01:00",
          end_time: "2020-01-12+01:00",
        },
        client_info: {
          telemetry_sdk_build: "32.0.0"
        }
      };
      await db.recordPing(path, identifier, payload);

      // Add weird stuff to the db
      await db["store"].update(["incorrect"], () => "wrong data");
      await db["store"].update(["more", "incorrectness"], () => "more wrong data");

      const allPings = await db.getAllPings();
      assert.strictEqual(Object.keys(allPings).length, 1);
      assert.deepStrictEqual({
        [identifier]: { path, payload }
      }, allPings);
    });

    it("getAllPings works correct when data is all correct", async function () {
      const db = new Database(Glean.platform.Storage);
      const path = "some/random/path/doesnt/matter";
      const payload = {
        ping_info: {
          seq: 1,
          start_time: "2020-01-11+01:00",
          end_time: "2020-01-12+01:00",
        },
        client_info: {
          telemetry_sdk_build: "32.0.0"
        }
      };

      const identifiers = ["foo", "bar", "baz", "qux", "etc"];
      for (const identifier of identifiers) {
        await db.recordPing(path, identifier, payload);
      }

      const allPings = await db.getAllPings();
      assert.strictEqual(Object.keys(allPings).length, 5);
      for (const [index, identifier] of identifiers.entries()) {
        assert.strictEqual(identifier, identifiers[index]);
      }
    });

    it("getAllPings dosen't error when there are no pings stored", async function () {
      const db = new Database(Glean.platform.Storage);
      assert.deepStrictEqual({}, await db.getAllPings());
    });
  });

  describe("delete", function() {
    it("deleting works", async function() {
      const db = new Database(Glean.platform.Storage);
      const path = "some/random/path/doesnt/matter";
      const payload = {
        ping_info: {
          seq: 1,
          start_time: "2020-01-11+01:00",
          end_time: "2020-01-12+01:00",
        },
        client_info: {
          telemetry_sdk_build: "32.0.0"
        }
      };

      const identifiers = ["foo", "bar", "baz", "qux", "etc"];
      for (const identifier of identifiers) {
        await db.recordPing(path, identifier, payload);
      }

      await db.deletePing("foo");
      const allPings = await db.getAllPings();
      assert.strictEqual(Object.keys(allPings).length, 4);
      for (const [index, identifier] of identifiers.entries()) {
        assert.strictEqual(identifier, identifiers[index]);
      }

      await db.deletePing("bar");
      const allPings2 = await db.getAllPings();
      assert.strictEqual(Object.keys(allPings2).length, 3);
      for (const [index, identifier] of identifiers.entries()) {
        assert.strictEqual(identifier, identifiers[index]);
      }
    });

    it("deleting a ping that is not in the db doesn't error", async function() {
      const db = new Database(Glean.platform.Storage);
      const path = "some/random/path/doesnt/matter";
      const payload = {
        ping_info: {
          seq: 1,
          start_time: "2020-01-11+01:00",
          end_time: "2020-01-12+01:00",
        },
        client_info: {
          telemetry_sdk_build: "32.0.0"
        }
      };

      const identifiers = ["foo", "bar", "baz", "qux", "etc"];
      for (const identifier of identifiers) {
        await db.recordPing(path, identifier, payload);
      }

      await db.deletePing("no existo");
      const allPings = await db.getAllPings();
      assert.strictEqual(Object.keys(allPings).length, 5);
      for (const [index, identifier] of identifiers.entries()) {
        assert.strictEqual(identifier, identifiers[index]);
      }
    });
  });

  describe("clear", function () {
    it("clearing works", async function() {
      const db = new Database(Glean.platform.Storage);
      const path = "some/random/path/doesnt/matter";
      const payload = {
        ping_info: {
          seq: 1,
          start_time: "2020-01-11+01:00",
          end_time: "2020-01-12+01:00",
        },
        client_info: {
          telemetry_sdk_build: "32.0.0"
        }
      };

      const identifiers = ["foo", "bar", "baz", "qux", "etc"];
      for (const identifier of identifiers) {
        await db.recordPing(path, identifier, payload);
      }
  
      await db.clearAll();
      assert.strictEqual(Object.keys(await db["store"]._getWholeStore()).length, 0);
    });
  });

  describe("pending pings", function() {
    it("scanning the pending pings directory fills up the queue", async function() {
      let resolver: (value: unknown) => void;
      const testPromise = new Promise(r => resolver = r);
      let pingIds: string[] = [];
      const observer: Observer = {
        update(id: string): void {
          pingIds.push(id);

          if (pingIds.length == 10) {
            resolver(pingIds);
          }
        }
      };
      const db = new Database(Glean.platform.Storage);
      db.attachObserver(observer);

      const path = "some/random/path/doesnt/matter";
      const payload = {
        ping_info: {
          seq: 1,
          start_time: "2018-02-24+01:00",
          end_time: "2018-02-25+11:00",
        },
        client_info: {
          telemetry_sdk_build: "32.0.0"
        }
      };

      for (let id = 0; id < 10; id++) {
        const newPayload = payload;
        newPayload.ping_info.seq = id;
        await db.recordPing(path, `id-${id}`, payload);
      }

      // Reset the ids we've seen because `Observer` will get called once again in `record`.
      pingIds = [];

      await db.scanPendingPings();
      await testPromise;
      assert.strictEqual(pingIds.length, 10);
      for (let id = 0; id < 10; id++) {
        assert.ok(id in pingIds);
      }
    });
  });
});
