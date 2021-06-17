/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import * as utils from "../../../src/core/utils";

describe("utils", function() {
  it("isObject validates correctly", function() {
    class RandomClass {}

    // Invalid values
    assert.strictEqual(utils.isObject(new RandomClass()), false);
    assert.strictEqual(utils.isObject(null), false);
    assert.strictEqual(utils.isObject(NaN), false);

    // Valid values
    assert.strictEqual(utils.isObject({}), true);
    assert.strictEqual(utils.isObject(new Object()), true);
    assert.strictEqual(utils.isObject({ 1: "test" }), true);
    assert.strictEqual(utils.isObject({ "test": "test" }), true);
  });

  it("isUndefined validates correctly", function() {
    const obj: Record<string, unknown> = { "test": "test" };

    // Invalid values
    assert.strictEqual(utils.isUndefined(obj["test"]), false);
    assert.strictEqual(utils.isUndefined("something else"), false);
    assert.strictEqual(utils.isUndefined(null), false);
    assert.strictEqual(utils.isUndefined(NaN), false);

    // Valid values
    assert.strictEqual(utils.isUndefined(undefined), true);
    assert.strictEqual(utils.isUndefined(obj["prop"]), true);
  });

  it("isString validates correctly", function() {
    const obj: Record<string, unknown> = { "test": "test" };

    // Invalid values
    assert.strictEqual(utils.isString(undefined), false);
    assert.strictEqual(utils.isString({}), false);
    assert.strictEqual(utils.isString(obj["prop"]), false);
    assert.strictEqual(utils.isString(null), false);
    assert.strictEqual(utils.isString(NaN), false);

    // Valid values
    assert.strictEqual(utils.isString(""), true);
    assert.strictEqual(utils.isString("something else"), true);
    assert.strictEqual(utils.isString(obj["test"]), true);
  });

  it("isBoolean validates correctly", function() {
    // Invalid values
    assert.strictEqual(utils.isBoolean(undefined), false);
    assert.strictEqual(utils.isBoolean("something else"), false);
    assert.strictEqual(utils.isBoolean({}), false);

    // Valid values
    assert.strictEqual(utils.isBoolean(true), true);
    assert.strictEqual(utils.isBoolean(false), true);
    assert.strictEqual(utils.isBoolean(!!"something else"), true);
  });

  it("isNumber validates correctly", function() {
    // Invalid values
    assert.strictEqual(utils.isNumber(undefined), false);
    assert.strictEqual(utils.isNumber("10"), false);
    assert.strictEqual(utils.isNumber({}), false);
    assert.strictEqual(utils.isNumber(NaN), false);

    // Valid values
    assert.strictEqual(utils.isNumber(10), true);
    assert.strictEqual(utils.isNumber(-10), true);
  });

  it("isInteger validates correctly", function() {
    // Invalid values
    assert.strictEqual(utils.isInteger(undefined), false);
    assert.strictEqual(utils.isInteger("10"), false);
    assert.strictEqual(utils.isInteger({}), false);
    assert.strictEqual(utils.isInteger(NaN), false);
    assert.strictEqual(utils.isInteger(0.1), false);
    assert.strictEqual(utils.isInteger(Math.PI), false);
    assert.strictEqual(utils.isInteger(Infinity), false);
    assert.strictEqual(utils.isInteger(-Infinity), false);
    assert.strictEqual(utils.isInteger(true), false);
    assert.strictEqual(utils.isInteger(false), false);
    assert.strictEqual(utils.isInteger([1]), false);
    assert.strictEqual(utils.isInteger(5.000000000000001), false);

    // Valid values
    assert.strictEqual(utils.isInteger(10), true);
    assert.strictEqual(utils.isInteger(-10), true);
    assert.strictEqual(utils.isInteger(0), true);
    assert.strictEqual(utils.isInteger(-100000), true);
    assert.strictEqual(utils.isInteger(99999999999999999999999), true);
    assert.strictEqual(utils.isInteger(5.0), true);
    assert.strictEqual(utils.isInteger(5.0000000000000001), true);
  });

  it("sanitizeApplicationId works correctly", function() {
    assert.strictEqual(utils.sanitizeApplicationId("org.mozilla.test-app"), "org-mozilla-test-app");
    assert.strictEqual(utils.sanitizeApplicationId("org.mozilla..test---app"), "org-mozilla-test-app");
    assert.strictEqual(utils.sanitizeApplicationId("org-mozilla-test-app"), "org-mozilla-test-app");
    assert.strictEqual(utils.sanitizeApplicationId("org.mozilla.Test.App"), "org-mozilla-test-app");
  });

  it("validateURL works correctly", function() {
    // Invalid values
    assert.strictEqual(utils.validateURL(""), false);
    assert.strictEqual(utils.validateURL("crealy not a url"), false);
    assert.strictEqual(utils.validateURL("glean://wrong.protocol"), false);
    assert.strictEqual(utils.validateURL("http://"), false);

    // Valid values
    assert.strictEqual(utils.validateURL("http://incoming.telemetry.mozilla.org"), true);
    assert.strictEqual(utils.validateURL("http://localhost/"), true);
    assert.strictEqual(utils.validateURL("https://incoming.telemetry.mozilla.org"), true);
    assert.strictEqual(utils.validateURL("https://localhost:3000/"), true);
  });

  it("validateHeader works correctly", function () {
    // Invalid values
    assert.strictEqual(utils.validateHeader(""), false);
    assert.strictEqual(utils.validateHeader("invalid_value"), false);
    assert.strictEqual(utils.validateHeader("invalid value"), false);
    assert.strictEqual(utils.validateHeader("!nv@lid-val*e"), false);
    assert.strictEqual(utils.validateHeader("invalid-value-because-way-too-long"), false);

    // Valid values
    assert.strictEqual(utils.validateHeader("valid-value"), true);
    assert.strictEqual(utils.validateHeader("-also-valid-value"), true);
  });

  it("utf-8 enconding works the same with or without TextEncoder in the environment", function () {
    const encoded = utils.UTF8EncodeText("{\"metrics\":{\"datetime\":{\"sample.app_started\":\"2021-06-17T11:51:45.767+02:00\"},\"counter\":{\"sample.button_clicked\":1}},\"ping_info\":{\"seq\":0,\"start_time\":\"2021-06-17T11:51+02:00\",\"end_time\":\"2021-06-17T11:51+02:00\"},\"client_info\":{\"telemetry_sdk_build\":\"0.15.0\",\"client_id\":\"9bb711c2-cff3-498c-8a65-778c66fea72d\",\"first_run_date\":\"2021-06-17+02:00\",\"os\":\"Darwin\",\"os_version\":\"Unknown\",\"architecture\":\"Unknown\",\"locale\":\"en-DE\",\"app_build\":\"Unknown\",\"app_display_version\":\"Unknown\"}}");

    const originalTextEncoder = TextEncoder;
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.TextEncoder = undefined;
    const encodedWithoutTextEncoder = utils.UTF8EncodeText("{\"metrics\":{\"datetime\":{\"sample.app_started\":\"2021-06-17T11:51:45.767+02:00\"},\"counter\":{\"sample.button_clicked\":1}},\"ping_info\":{\"seq\":0,\"start_time\":\"2021-06-17T11:51+02:00\",\"end_time\":\"2021-06-17T11:51+02:00\"},\"client_info\":{\"telemetry_sdk_build\":\"0.15.0\",\"client_id\":\"9bb711c2-cff3-498c-8a65-778c66fea72d\",\"first_run_date\":\"2021-06-17+02:00\",\"os\":\"Darwin\",\"os_version\":\"Unknown\",\"architecture\":\"Unknown\",\"locale\":\"en-DE\",\"app_build\":\"Unknown\",\"app_display_version\":\"Unknown\"}}");

    assert.deepStrictEqual(encoded, encodedWithoutTextEncoder);

    global.TextEncoder = originalTextEncoder;
  });
});
