/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { strict as assert } from "assert";
import { ErrorType } from "@mozilla/glean/error";
import { testResetGlean } from "@mozilla/glean/testing";

import main from "./main.js";
import { execution } from "./generated/pings.js";
import { appStarted } from "./generated/sample.js";

describe("node-sample", function () {
  const testAppId = `node.test.${this.title}`;

  beforeEach(async function () {
    await testResetGlean(testAppId);
  });

  describe("sample test", function () {
    it("appStarted metric is recorded and ping is sent", async function () {
      // Setup validator for sending of the execution ping.
      const pingWasSent = execution.testBeforeNextSubmit(async () => {
        // Check there is some value in the app started metric.
        assert.ok(await appStarted.testGetValue() !== undefined);
        // Check no errors were recorded on that metric either.
        assert.equal(
          await appStarted.testGetNumRecordedErrors(ErrorType.InvalidValue),
          0
        );
      });

      // Call the sample script.
      // This will record the metric and send the ping we are expecting.
      main();

      // Check that the ping validator does not throw.
      assert.doesNotThrow(async () => await pingWasSent);
    });
  });
});
