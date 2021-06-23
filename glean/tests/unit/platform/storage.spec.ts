/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sqlite3 from "sqlite3";

import { firefoxDriver, setupFirefox, webExtensionAPIProxyBuilder } from "./utils/webext";
import type Store from "../../../src/core/storage";

import TestStore from "../../../src/platform/test/storage";
import QMLStore from "../../../src/platform/qt/storage";
import WebExtStore from "../../../src/platform/webext/storage";
import type { JSONValue } from "../../../src/core/utils";
import { isUndefined } from "../../../src/core/utils";

/**
 * QMLStore implementation, but instead of relying on QML's LocalStorage
 * executes queries using the Node.js sqlite3 package.
 */
const TEST_DATABASE_NAME = "TestGlean";
let QMLMockDB: sqlite3.Database;
await new Promise<void>(resolve =>
  QMLMockDB = new sqlite3.Database(`/tmp/${TEST_DATABASE_NAME}.sqlite3`, () => resolve())
);
class MockQMLStore extends QMLStore {
  constructor(tableName: string) {
    super(tableName, TEST_DATABASE_NAME, true);
  }

  _executeQuery(query: string): Promise<LocalStorage.QueryResult | undefined> {
    return new Promise((resolve, reject) => {
      QMLMockDB.all(query, (err, rows) => {
        if (err) {
          console.error("SQLITE ERROR!", err, query);
          reject();
        }
        resolve({
          rows: {
            length: rows?.length || 0,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            item: (index: number) => rows[index] || undefined
          }
        });
      });
    });
  }
}

// This object will contain the store names and
// a function that will initialize and return the store when done.
const stores: {
  [store: string]: {
    initializeStore: () => Store,
    before?: () => Promise<void>,
    afterAll?: () => Promise<void>
  }
} = {
  "TestStore": {
    initializeStore: (): TestStore => new TestStore("unused")
  },
  "QMLStore": {
    initializeStore: (): MockQMLStore => new MockQMLStore("test"),
    afterAll: async () => {
      QMLMockDB.close();
      return Promise.resolve();
    }
  },
  "WebExtStore": {
    initializeStore: (): WebExtStore => new WebExtStore("test"),
    before: async () => {
      await setupFirefox();
      // Browser needs to be global so that WebExtStore will be built and able to use it.
      global.browser = {
        storage: {
          // We need to ignore type checks because TS will complain about
          // not defining the `remove` method, which is not necessary for our tests.
          //
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          local: {
            // We need to ignore type checks for the following properties because they do not
            // match perfectly with what is decribed by out web ext types package.
            // Moreover, it will also complain about not defining the `clear` and `remove`
            // methods, but these are not necessary for our tests.
            //
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            get: webExtensionAPIProxyBuilder(firefoxDriver, ["storage", "local", "get"]),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            set: webExtensionAPIProxyBuilder(firefoxDriver, ["storage", "local", "set"]),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            clear: webExtensionAPIProxyBuilder(firefoxDriver, ["storage", "local", "clear"])
          }
        }
      };
      await browser.storage.local.clear();
    },
    afterAll: async () => await firefoxDriver.quit()
  }
};

for (const store in stores) {
  const currentStore = stores[store];

  describe(`storage/${store}`, function () {
    after(async function () {
      !isUndefined(currentStore.afterAll) && await currentStore.afterAll();
    });

    describe("get", function () {
      let store: Store;
      const expected = {
        bip: {
          bling: false,
          bop: {
            blip: "something, something!",
            blergh: "don't panic!",
            burp: "you are doing great!",
          },
          boing: "almost done!",
          bok: {
            blot: "smile!",
            bet: "this is the end!",
          },
        },
        bump: "not quite!",
      };

      before(async function () {
        !isUndefined(currentStore.before) && await currentStore.before();
        store = currentStore.initializeStore();
        await store.update(["bip", "bling"], () => false);
        await store.update(["bip", "bop", "blip"], () => "something, something!");
        await store.update(["bip", "bop", "blergh"], () => "don't panic!");
        await store.update(["bip", "bop", "burp"], () => "you are doing great!");
        await store.update(["bip", "boing"], () => "almost done!");
        await store.update(["bip", "bok", "blot"], () => "smile!");
        await store.update(["bip", "bok", "bet"], () => "this is the end!");
        await store.update(["bump"], () => "not quite!");
      });

      it("Attempting to get the whole store works", async function () {
        const value = await store._getWholeStore();
        assert.deepStrictEqual(value, expected);
      });

      it("Attempting to get a non-existent entry doesn't error", async function () {
        const value = await store.get(["random", "inexistent", "index"]);
        assert.strictEqual(value, undefined);
      });

      it("Attempting to get a non-existent nested entry works", async function () {
        const value = await store.get(["bip", "bop", "inexistent"]);
        assert.strictEqual(value, undefined);
      });

      it("Attempting to get an index that contains an object works", async function () {
        const value = await store.get(["bip", "bok"]);
        assert.deepStrictEqual(value, expected["bip"]["bok"]);
      });

      it("Attempting to get an index that contains a string works", async function () {
        const value = await store.get(["bump"]);
        assert.deepStrictEqual(value, expected["bump"]);
      });

      it("Attempting to get an index that contains a boolean works", async function () {
        const value = await store.get(["bip", "bling"]);
        assert.strictEqual(value, expected["bip"]["bling"]);
      });
    });

    describe("update", function () {
      let store: Store;
      const index = ["bip", "bop", "blip"];
      const value = "something, something!";

      before(async function() {
        !isUndefined(currentStore.before) && await currentStore.before();
        store = currentStore.initializeStore();
      });

      it("Attempting to update a non-existent entry works", async function () {
        await store.update(index, () => value);
        assert.strictEqual(value, await store.get(index));
      });

      it("Attempting to update an existing entry doesn't error ", async function () {
        const updater = (v?: JSONValue): string => `${JSON.stringify(v)} new and improved!`;
        await store.update(index, updater);
        assert.strictEqual(updater(value), await store.get(index));
      });

      it("Attempting to update a nested entry doesn't error and overwrites", async function () {
        const updatedIndex = index.slice(1);
        await store.update(updatedIndex, () => value);
        assert.strictEqual(value, await store.get(updatedIndex));
      });

      it("Attempting to update an empty index throws an error", function () {
        store
          .update([], () => "should never get here!")
          .then(() =>
            assert.ok(
              false,
              "Attempting to update with an empty index should fail."
            )
          )
          .catch(() => assert.ok(true));
      });
    });

    describe("delete", function () {
      let store: Store;
      const index = ["bip", "bop", "blip"];
      const value = "something, something!";

      before(async function() {
        !isUndefined(currentStore.before) && await currentStore.before();
        store = currentStore.initializeStore();
      });

      it("Attempting to delete an existing index works", async function () {
        await store.update(index, () => value);
        assert.strictEqual(value, await store.get(index));

        await store.delete(index);
        assert.strictEqual(await store.get(index), undefined);
      });

      it("Attempting to delete a non-existing entry is a no-op", async function () {
        await store.update(index, () => value);
        const storeSnapshot = await store._getWholeStore();

        await store.delete(["random", "inexistent", "index"]);
        assert.deepStrictEqual(
          storeSnapshot,
          await store._getWholeStore()
        );
      });

      it("Attempting to delete an index that is not correct is a no-op", async function () {
        await store.update(index, () => value);
        const storeSnapshot = await store._getWholeStore();

        await store.delete(index.slice(1));
        assert.deepStrictEqual(
          storeSnapshot,
          await store._getWholeStore()
        );
      });

      it("Attempting to delete an empty index deletes all entries in the store", async function () {
        await store.delete([]);
        assert.deepStrictEqual({}, await store._getWholeStore());
      });
    });
  });
}
