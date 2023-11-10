/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import "fake-indexeddb/auto";

import type Store from "../../../src/core/storage/async";
import type { OptionalAsync } from "../../../src/core/types";
import type { JSONValue } from "../../../src/core/utils";

import TestStore from "../../../src/platform/test/storage";
import { isUndefined } from "../../../src/core/utils";


// This object will contain all the asynchronous store names and
// a function that will initialize and return the store when done.
const asyncStores: {
  [store: string]: {
    initializeStore: () => OptionalAsync<Store>,
    before?: () => Promise<void>,
    afterAll?: () => Promise<void>
  }
} = {
  "TestStore": {
    initializeStore: (): TestStore => new TestStore("unused")
  }
};

for (const store in asyncStores) {
  const currentStore = asyncStores[store];

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
        store = await currentStore.initializeStore();
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
        const value = await store.get();
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
        store = await currentStore.initializeStore();
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
        store = await currentStore.initializeStore();
      });

      it("Attempting to delete an existing index works", async function () {
        await store.update(index, () => value);
        assert.strictEqual(value, await store.get(index));

        await store.delete(index);
        assert.strictEqual(await store.get(index), undefined);
      });

      it("Attempting to delete a non-existing entry is a no-op", async function () {
        await store.update(index, () => value);
        const storeSnapshot = await store.get();

        await store.delete(["random", "inexistent", "index"]);
        assert.deepStrictEqual(
          storeSnapshot,
          await store.get()
        );
      });

      it("Attempting to delete an index that is not correct is a no-op", async function () {
        await store.update(index, () => value);
        const storeSnapshot = await store.get();

        await store.delete(index.slice(1));
        assert.deepStrictEqual(
          storeSnapshot,
          await store.get()
        );
      });

      it("Attempting to delete an empty index deletes all entries in the store", async function () {
        await store.delete([]);
        assert.deepStrictEqual(undefined, await store.get());
      });
    });
  });
}

// TODO
// Write tests for the synchronous store. `LocalStorage` does not exist by default,
// so it needs to be mocked instead, like we do for QML.
//
// This object will contain all the synchronous store names and
// a function that will initialize and return the store when done.
// const syncStores: {
//   [store: string]: {
//     initializeStore: () => SynchronousStore;
//     before?: () => void;
//     afterAll?: () => void;
//   };
// } = {
//   WebStore: {
//     initializeStore: (): WebStore => {
//       const store = new WebStore("test");
//       // Clear the store before starting.
//       store.delete([]);
//       return store;
//     }
//   }
// };
