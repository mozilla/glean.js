/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import { Context } from "../../../src/core/context";
import Glean from "../../../src/core/glean";
import MetricsDatabase from "../../../src/core/metrics/database";
import EventsDatabase from "../../../src/core/metrics/events_database";
import PingsDatabase from "../../../src/core/pings/database";
import { testResetGlean } from "../../../src/core/testing";
import { testUninitializeGlean } from "../../../src/core/testing/utils";
import { sanitizeApplicationId } from "../../../src/core/utils";

describe("Context", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(function () {
    testResetGlean(testAppId);
  });

  it("uploadEnabled contains the expected value", function () {
    assert.strictEqual(Context.uploadEnabled, true);

    Glean.setUploadEnabled(false);
    assert.strictEqual(Context.uploadEnabled, false);
  });

  it("appId contains the expected value", function () {
    assert.strictEqual(Context.applicationId, sanitizeApplicationId(testAppId));

    testResetGlean("new-id");
    assert.strictEqual(Context.applicationId, sanitizeApplicationId("new-id"));
  });

  it("initialized contains the expected value", function () {
    assert.strictEqual(Context.initialized, true);

    testUninitializeGlean();
    assert.strictEqual(Context.initialized, false);
  });

  it("databases contain the expected values", function () {
    assert.notStrictEqual(Context.metricsDatabase, undefined);
    assert.ok(Context.metricsDatabase instanceof MetricsDatabase);

    assert.notStrictEqual(Context.eventsDatabase, undefined);
    assert.ok(Context.eventsDatabase instanceof EventsDatabase);

    assert.notStrictEqual(Context.pingsDatabase, undefined);
    assert.ok(Context.pingsDatabase instanceof PingsDatabase);
  });
});
