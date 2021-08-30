/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import type { SinonFakeTimers } from "sinon";
import sinon from "sinon";

import type { Observer} from "../../../../src/core/pings/database";
import Database, { isValidPingInternalRepresentation } from "../../../../src/core/pings/database";
import Glean from "../../../../src/core/glean";
import type { JSONObject } from "../../../../src/core/utils";

const sandbox = sinon.createSandbox();
const now = new Date();

describe("PingsDatabase", function() {
  const testAppId = `gleanjs.test.${this.title}`;
  let clock: SinonFakeTimers;

  beforeEach(async function() {
    clock = sandbox.useFakeTimers(now.getTime());
    await Glean.testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
    clock.restore();
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
        collectionDate: now.toISOString(), path, payload
      });

      const headers = { "X-Debug-ID": "test" };
      const otherIdentifier = "THE OTHER IDENTIFIER";
      await db.recordPing(path, otherIdentifier, payload, headers);
      assert.deepStrictEqual(await db["store"].get([otherIdentifier]), {
        collectionDate: now.toISOString(), path, payload, headers
      });

      assert.strictEqual(Object.keys(await db["store"].get() as JSONObject).length, 2);
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
      assert.strictEqual(allPings.length, 1);
      assert.deepStrictEqual([
        [ identifier, { collectionDate: now.toISOString(), path, payload } ]
      ], allPings);
    });

    it("getAllPings works correctly when data is all correct", async function () {
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
      assert.strictEqual(allPings.length, 5);
      for (const [index, [ identifier, _ ] ] of allPings.entries()) {
        assert.strictEqual(identifier, identifiers[index]);
      }
    });

    it("getAllPings returns pings in ascending order by date", async function () {
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
      for (const [index, identifier] of identifiers.entries()) {
        // Move time backwards, so that orderding needs to be the reverse of the recording order.
        // This way we are sure there was intentional sorting.
        //
        // Note: It is not possible to use sinon's fake timers here,
        // because they don't tick backwards.
        const fakeISOString = (new Date(now.getTime() - 100 * index)).toISOString();
        const stub = sinon
          .stub(Date.prototype, "toISOString")
          .callsFake(() => fakeISOString);
        await db.recordPing(path, identifier, payload);
        stub.restore();
      }

      const allPings = await db.getAllPings();
      assert.strictEqual(allPings.length, 5);
      for (const [index, [ identifier, _ ] ] of allPings.reverse().entries()) {
        assert.strictEqual(identifier, identifiers[index]);
      }
    });

    it("getAllPings dosen't error when there are no pings stored", async function () {
      const db = new Database(Glean.platform.Storage);
      assert.deepStrictEqual([], await db.getAllPings());
    });

    it("size quota is enforced by getAllPingsWithoutSurplus", async function() {
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

      // Set a size quota that is just above the size of `payload`,
      // that will leave one ping in the db, but all others should be deleted.
      const allPings = await db["getAllPingsWithoutSurplus"](
        250 /* maxCount */,
        300 /* maxSize */
      );
      assert.strictEqual(allPings.length, 1);
      // Only newest ping was left.
      const [[ identifier ]] = allPings;
      assert.strictEqual(identifier, identifiers[identifiers.length - 1]);
    });

    it("ping count quota is enforced by getAllPingsWithoutSurplus", async function() {
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

      // Set a size quota that is just above the size of `payload`,
      // that will leave one ping in the db, but all others should be deleted.
      const allPings = await db["getAllPingsWithoutSurplus"](
        1 /* maxCount */,
      );
      assert.strictEqual(allPings.length, 1);
      // Only newest ping was left.
      const [[ identifier ]] = allPings;
      assert.strictEqual(identifier, identifiers[identifiers.length - 1]);
    });

    it("deletion-request are never deleted, even if quota is hit", async function() {
      const db = new Database(Glean.platform.Storage);
      const deletionRequestPath = "/submit/applicationId/deletion-request/schema-version/identifier";
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
        await db.recordPing(deletionRequestPath, `deletion-${identifier}`, payload);
        await db.recordPing(path, identifier, payload);
      }

      // Set a size quota that is just above the size of `payload`,
      // that will leave one ping in the db, but all others should be deleted.
      const allPings = await db["getAllPingsWithoutSurplus"](
        1 /* maxCount */,
      );

      // All deletion pings were left and only one of the ordinary pings.
      assert.strictEqual(allPings.length, identifiers.length + 1);

      // The first five pings are deletion request pings.
      const deletionRequestPings = allPings.slice(0, identifiers.length);
      for (const [ identifier ] of deletionRequestPings) {
        assert.ok(identifier.startsWith("deletion-"));
      }
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
      assert.strictEqual(allPings.length, 4);
      for (const [index, [identifier, _]] of allPings.entries()) {
        assert.strictEqual(identifier, identifiers[index + 1]);
      }

      await db.deletePing("bar");
      const allPings2 = await db.getAllPings();
      assert.strictEqual(allPings2.length, 3);
      for (const [index, [identifier, _]] of allPings2.entries()) {
        assert.strictEqual(identifier, identifiers[index + 2]);
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
      assert.strictEqual(allPings.length, 5);
      for (const [index, [ identifier, _]] of allPings.entries()) {
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
      assert.strictEqual(Object.keys(await db["store"].get() || {}).length, 0);
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
