/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import { isBoolean, isObject, isString, isUndefined } from "utils";

describe("utils", function() {
  it("isObject validates correctly", function() {
    class RandomClass {}

    // Invalid values
    assert.strictEqual(isObject(new RandomClass()), false);
    assert.strictEqual(isObject(null), false);
    assert.strictEqual(isObject(NaN), false);

    // Valid values
    assert.strictEqual(isObject({}), true);
    assert.strictEqual(isObject(new Object()), true);
    assert.strictEqual(isObject({ 1: "test" }), true);
    assert.strictEqual(isObject({ "test": "test" }), true);
  });

  it("isUndefined validates correctly", function() {
    const obj: Record<string, unknown> = { "test": "test" };

    // Invalid values
    assert.strictEqual(isUndefined(obj["test"]), false);
    assert.strictEqual(isUndefined("something else"), false);
    assert.strictEqual(isUndefined(null), false);
    assert.strictEqual(isUndefined(NaN), false);

    // Valid values
    assert.strictEqual(isUndefined(undefined), true);
    assert.strictEqual(isUndefined(obj["prop"]), true);
  });

  it("isString validates correctly", function() {
    const obj: Record<string, unknown> = { "test": "test" };

    // Invalid values
    assert.strictEqual(isString(undefined), false);
    assert.strictEqual(isString({}), false);
    assert.strictEqual(isString(obj["prop"]), false);
    assert.strictEqual(isString(null), false);
    assert.strictEqual(isString(NaN), false);

    // Valid values
    assert.strictEqual(isString(""), true);
    assert.strictEqual(isString("something else"), true);
    assert.strictEqual(isString(obj["test"]), true);
    assert.strictEqual(isString(new String("check")), true);
  });

  it("isBoolean validates correctly", function() {
    // Invalid values
    assert.strictEqual(isBoolean(undefined), false);
    assert.strictEqual(isBoolean("something else"), false);
    assert.strictEqual(isBoolean({}), false);

    // Valid values
    assert.strictEqual(isBoolean(true), true);
    assert.strictEqual(isBoolean(false), true);
    assert.strictEqual(isBoolean(new Boolean(true)), true);
    assert.strictEqual(isBoolean(!!"something else"), true);
  });
});
