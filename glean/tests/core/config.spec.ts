/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import { Configuration } from "../../src/core/config";

describe("config", function() {
  it("validateSourceTags works correctly", function () {
    // Invalid values
    assert.ok(!Configuration.validateSourceTags([]));
    assert.ok(!Configuration.validateSourceTags([""]));
    assert.ok(!Configuration.validateSourceTags(["1", "2", "3", "4", "5", "6"]));
    assert.ok(!Configuration.validateSourceTags(["!nv@lid-val*e"]));
    assert.ok(!Configuration.validateSourceTags(["glean-test1", "test2"]));

    // Valid values
    assert.ok(Configuration.validateSourceTags(["5"]));
  });

  it("sanitizeDebugOptions works correctly", function() {
    // Invalid values
    assert.deepStrictEqual(Configuration.sanitizeDebugOptions({
      debugViewTag: ""
    }), {});
    assert.deepStrictEqual(Configuration.sanitizeDebugOptions({
      sourceTags: []
    }), {});
    assert.deepStrictEqual(Configuration.sanitizeDebugOptions({
      debugViewTag: "",
      sourceTags: ["ok"]
    }), { sourceTags: ["ok"] });
    assert.deepStrictEqual(Configuration.sanitizeDebugOptions({
      debugViewTag: "",
      logPings: true,
      sourceTags: ["ok"]
    }), { sourceTags: ["ok"], logPings: true });

    // Valid values
    assert.deepStrictEqual(Configuration.sanitizeDebugOptions({}), {});
    assert.deepStrictEqual(
      Configuration.sanitizeDebugOptions({ logPings: true }),
      { logPings: true }
    );
    assert.deepStrictEqual(
      Configuration.sanitizeDebugOptions({ debugViewTag: "ok" }),
      { debugViewTag: "ok" }
    );
    assert.deepStrictEqual(
      Configuration.sanitizeDebugOptions({ sourceTags: ["ok"] }),
      { sourceTags: ["ok"] }
    );
  });
});
