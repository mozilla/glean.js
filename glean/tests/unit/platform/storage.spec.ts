/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import "fake-indexeddb/auto";

import type Store from "../../../src/core/storage.js";
import type { JSONValue } from "../../../src/core/utils";

import TestStore from "../../../src/platform/test/storage";
import { isUndefined } from "../../../src/core/utils";

const stores: {
  [store: string]: {
    initializeStore: () => Store,
    before?: () => Promise<void>,
    afterAll?: () => Promise<void>
  }
} = {
  "TestStore": {
    initializeStore: (): TestStore => new TestStore("unused")
  }
};

for (const store in stores) {
  const currentStore = stores[store];

  describe(`storage/${store}`, function () {
    after(async function () {
      if (!isUndefined(currentStore.afterAll)) {
        await currentStore.afterAll();
      }
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
        if (!isUndefined(currentStore.before)) {
          await currentStore.before();
        }
        store = currentStore.initializeStore();
        store.update(["bip", "bling"], () => false);
        store.update(["bip", "bop", "blip"], () => "something, something!");
        store.update(["bip", "bop", "blergh"], () => "don't panic!");
        store.update(["bip", "bop", "burp"], () => "you are doing great!");
        store.update(["bip", "boing"], () => "almost done!");
        store.update(["bip", "bok", "blot"], () => "smile!");
        store.update(["bip", "bok", "bet"], () => "this is the end!");
        store.update(["bump"], () => "not quite!");
      });

      it("Attempting to get the whole store works", function () {
        const value = store.get();
        assert.deepStrictEqual(value, expected);
      });

      it("Attempting to get a non-existent entry doesn't error", function () {
        const value = store.get(["random", "inexistent", "index"]);
        assert.strictEqual(value, undefined);
      });

      it("Attempting to get a non-existent nested entry works", function () {
        const value = store.get(["bip", "bop", "inexistent"]);
        assert.strictEqual(value, undefined);
      });

      it("Attempting to get an index that contains an object works", function () {
        const value = store.get(["bip", "bok"]);
        assert.deepStrictEqual(value, expected["bip"]["bok"]);
      });

      it("Attempting to get an index that contains a string works", function () {
        const value = store.get(["bump"]);
        assert.deepStrictEqual(value, expected["bump"]);
      });

      it("Attempting to get an index that contains a boolean works", function () {
        const value = store.get(["bip", "bling"]);
        assert.strictEqual(value, expected["bip"]["bling"]);
      });
    });

    describe("update", function () {
      let store: Store;
      const index = ["bip", "bop", "blip"];
      const value = "something, something!";

      before(async function() {
        if (!isUndefined(currentStore.before)) {
          await currentStore.before();
        }
        store = currentStore.initializeStore();
      });

      it("Attempting to update a non-existent entry works", function () {
        store.update(index, () => value);
        assert.strictEqual(value, store.get(index));
      });

      it("Attempting to update an existing entry doesn't error ", function () {
        const updater = (v?: JSONValue): string => `${JSON.stringify(v)} new and improved!`;
        store.update(index, updater);
        assert.strictEqual(updater(value), store.get(index));
      });

      it("Attempting to update a nested entry doesn't error and overwrites", function () {
        const updatedIndex = index.slice(1);
        store.update(updatedIndex, () => value);
        assert.strictEqual(value, store.get(updatedIndex));
      });

      it("Attempting to update an empty index throws an error", function () {
        try {
          store.update([], () => "should never get here!");
          assert.ok(false, "Attempting to update with an empty index should fail.");
        } catch {
          assert.ok(true);
        }
      });
    });

    describe("delete", function () {
      let store: Store;
      const index = ["bip", "bop", "blip"];
      const value = "something, something!";

      before(async function() {
        if (!isUndefined(currentStore.before)) {
          await currentStore.before();
        }
        store = currentStore.initializeStore();
      });

      it("Attempting to delete an existing index works", function () {
        store.update(index, () => value);
        assert.strictEqual(value, store.get(index));

        store.delete(index);
        assert.strictEqual(store.get(index), undefined);
      });

      it("Attempting to delete a non-existing entry is a no-op", function () {
        store.update(index, () => value);
        const storeSnapshot = store.get();

        store.delete(["random", "inexistent", "index"]);
        assert.deepStrictEqual(
          storeSnapshot,
          store.get()
        );
      });

      it("Attempting to delete an index that is not correct is a no-op", function () {
        store.update(index, () => value);
        const storeSnapshot = store.get();

        store.delete(index.slice(1));
        assert.deepStrictEqual(
          storeSnapshot,
          store.get()
        );
      });

      it("Attempting to delete an empty index deletes all entries in the store", function () {
        store.delete([]);
        assert.deepStrictEqual(undefined, store.get());
      });
    });
  });
}
