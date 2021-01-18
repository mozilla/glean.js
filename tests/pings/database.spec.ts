/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Database, { Observer, isValidPingInternalRepresentation } from "pings/database";

describe("PingsDatabase", function() {

  describe("record", function () {
    it("records correctly to the correct place at the underlying storage", async function() {
      const db = new Database();
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
  
      const headers = { "X-Debug-Id": "test" };
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
        update: (id: string): void => {
          wasNotified = true;
          assert.strictEqual(id, identifier);
        }
      };
  
      const db = new Database(observer);
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
      const db = new Database();
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
      const db = new Database();
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
      identifiers.forEach(async (identifier) => {
        await db.recordPing(path, identifier, payload);
      });

      const allPings = await db.getAllPings();
      assert.strictEqual(Object.keys(allPings).length, 5);
      identifiers.forEach(async (identifier, index) => {
        assert.strictEqual(identifier, identifiers[index]);
      });
    });

    it("getAllPings dosen't error when there are no pings stored", async function () {
      const db = new Database();
      assert.deepStrictEqual({}, await db.getAllPings());
    });
  });

  describe("delete", function() {
    it("deleting works", async function() {
      const db = new Database();
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
      identifiers.forEach(async (identifier) => {
        await db.recordPing(path, identifier, payload);
      });

      await db.deletePing("foo");
      const allPings = await db.getAllPings();
      assert.strictEqual(Object.keys(allPings).length, 4);
      ["bar", "baz", "qux", "etc"].forEach(async (identifier, index) => {
        assert.strictEqual(identifier, identifiers[index]);
      });

      await db.deletePing("bar");
      const allPings2 = await db.getAllPings();
      assert.strictEqual(Object.keys(allPings2).length, 3);
      ["baz", "qux", "etc"].forEach(async (identifier, index) => {
        assert.strictEqual(identifier, identifiers[index]);
      });
    });

    it("deleting a ping that is not in the db doesn't error", async function() {
      const db = new Database();
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
      identifiers.forEach(async (identifier) => {
        await db.recordPing(path, identifier, payload);
      });

      await db.deletePing("no existo");
      const allPings = await db.getAllPings();
      assert.strictEqual(Object.keys(allPings).length, 5);
      identifiers.forEach(async (identifier, index) => {
        assert.strictEqual(identifier, identifiers[index]);
      });
    });
  });

  describe("clear", function () {
    it("clearing works", async function() {
      const db = new Database();
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
      identifiers.forEach(async (identifier) => {
        await db.recordPing(path, identifier, payload);
      });
  
      await db.clearAll();
      assert.strictEqual(Object.keys(await db["store"]._getWholeStore()).length, 0);
    });
  });
});
