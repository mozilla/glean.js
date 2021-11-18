/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import { Configuration } from "../../../src/core/config";
import { Context } from "../../../src/core/context";

const sandbox = sinon.createSandbox();

describe("config", function() {
  afterEach(function () {
    sandbox.restore();
  });

  it("serverEndpoint protocol is validated correctly", function () {
    const testingEndpoint = "http://mytest.com";
    const prodEndpoint = "https://mytest.com";
    const wrongEndpoint = "wrong://mytest.com";

    Context.testing = true;
    assert.doesNotThrow(() => new Configuration({ serverEndpoint: prodEndpoint }));
    assert.doesNotThrow(() => new Configuration({ serverEndpoint: testingEndpoint }));
    assert.throws(() => new Configuration({ serverEndpoint: wrongEndpoint }));

    Context.testing = false;
    assert.doesNotThrow(() => new Configuration({ serverEndpoint: prodEndpoint }));
    assert.throws(() => new Configuration({ serverEndpoint: testingEndpoint }));
    assert.throws(() => new Configuration({ serverEndpoint: wrongEndpoint }));
  });

  it("validation of sourceTags works correctly", function () {
    const config = new Configuration();

    // Invalid values
    config.sourceTags = [];
    assert.deepStrictEqual([], config.sourceTags);
    config.sourceTags = [""];
    assert.deepStrictEqual([], config.sourceTags);
    config.sourceTags = ["1", "2", "3", "4", "5", "6"];
    assert.deepStrictEqual([], config.sourceTags);
    config.sourceTags = ["!nv@lid-val*e"];
    assert.deepStrictEqual([], config.sourceTags);
    config.sourceTags = ["glean-test1", "test2"];
    assert.deepStrictEqual([], config.sourceTags);

    // Valid values
    config.sourceTags = ["5"];
    assert.deepStrictEqual(["5"], config.sourceTags);
  });
});
