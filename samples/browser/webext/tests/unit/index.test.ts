/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { strict as assert } from "assert";
import { ErrorType } from "@mozilla/glean/error";
import { testResetGlean } from "@mozilla/glean/testing";

import * as sample from "../../src/generated/sample.js";

describe("webext", function () {
  const testAppId = `webext.js.test.${this.title}`;

  beforeEach(async function () {
    await testResetGlean(testAppId);
  });

  describe("sample test", function () {
    it("a metric recording works", async function () {
      sample.popupOpened.add(1);
      assert.equal(await sample.popupOpened.testGetValue(), 1);
      assert.equal(
        await sample.popupOpened.testGetNumRecordedErrors(ErrorType.InvalidValue),
        0
      );
    });
  });
});
