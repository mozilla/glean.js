/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import Database, { Observer } from "pings/database";

describe("PingsDatabase", function() {
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

    await db.recordPing(path, "foo", payload);
    await db.recordPing(path, "bar", payload);
    await db.recordPing(path, "baz", payload);
    await db.recordPing(path, "qux", payload);
    assert.strictEqual(Object.keys(await db["store"]._getWholeStore()).length, 4);

    await db.clearAll();
    assert.strictEqual(Object.keys(await db["store"]._getWholeStore()).length, 0);
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
