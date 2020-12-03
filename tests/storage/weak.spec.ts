/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import { StorageValue } from "storage";
import WeakStore from "storage/weak";

describe("storage/WeakStore", function () {
  describe("get", function () {
    const store = new WeakStore();
    const expected = {
      bip: {
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
      await store.update(["bip", "bop", "blip"], () => "something, something!");
      await store.update(["bip", "bop", "blergh"], () => "don't panic!");
      await store.update(["bip", "bop", "burp"], () => "you are doing great!");
      await store.update(["bip", "boing"], () => "almost done!");
      await store.update(["bip", "bok", "blot"], () => "smile!");
      await store.update(["bip", "bok", "bet"], () => "this is the end!");
      await store.update(["bump"], () => "not quite!");
    });

    it("Attempting to get the whole store works", async function () {
      const value = await store._testOnly_getWholeStore();
      assert.deepStrictEqual(value, expected);
    });

    it("Attempting to get a non-existent entry doesn't error", async function () {
      const value = await store.get(["random", "inexistent", "index"]);
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
  });

  describe("update", function () {
    const store = new WeakStore();
    const index = ["bip", "bop", "blip"];
    const value = "something, something!";

    it("Attempting to update a non-existent entry works", async function () {
      await store.update(index, () => value);
      assert.strictEqual(value, await store.get(index));
    });

    it("Attempting to update an existing entry doesn't error ", async function () {
      const updater = (v?: StorageValue): string => `${v} new and improved!`;
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
    const store = new WeakStore();
    const index = ["bip", "bop", "blip"];
    const value = "something, something!";

    it("Attempting to delete an existing index works", async function () {
      await store.update(index, () => value);
      assert.strictEqual(value, await store.get(index));

      await store.delete(index);
      assert.strictEqual(await store.get(index), undefined);
    });

    it("Attempting to delete a non-existing entry is a no-op", async function () {
      await store.update(index, () => value);
      const storeSnapshot = await store._testOnly_getWholeStore();

      await store.delete(["random", "inexistent", "index"]);
      assert.deepStrictEqual(
        storeSnapshot,
        await store._testOnly_getWholeStore()
      );
    });

    it("Attempting to delete an index that is not correct is a no-op", async function () {
      await store.update(index, () => value);
      const storeSnapshot = await store._testOnly_getWholeStore();

      await store.delete(index.slice(1));
      assert.deepStrictEqual(
        storeSnapshot,
        await store._testOnly_getWholeStore()
      );
    });

    it("Attempting to delete an empty index deletes all entries in the store", async function () {
      await store.delete([]);
      assert.deepStrictEqual({}, await store._testOnly_getWholeStore());
    });
  });
});
