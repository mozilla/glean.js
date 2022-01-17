/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Glean from "../../../src/core/glean";
import PingType from "../../../src/core/pings/ping_type";
import { WaitableUploader } from "../../utils";
import collectAndStorePing, { makePath } from "../../../src/core/pings/maker";
import ExperimentPlugin from "../../../src/plugins/experiment";
import { ExperimentData } from "../../../src/core/metrics/types/experiment";
import * as PingMaker from "../../../src/core/pings/maker";

const sandbox = sinon.createSandbox();

describe("ExperimentPlugin", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("build ping info triggers the AfterPingInfoCollection and appends experiment data", async function () {
    const ping = new PingType({
      name: "test",
      includeClientId: false,
      sendIfEmpty: true,
    });
    const experimentData: ExperimentData = { branch: "test_branch" };

    const pingInfo = await PingMaker.buildPingInfoSection(ping, undefined, experimentData);

    assert.ok("experiment_data" in pingInfo);
    assert.ok(typeof pingInfo.experiment_data === "object");
    assert.ok("branch" in pingInfo.experiment_data);
    assert.equal(pingInfo.experiment_data.branch, "test_branch");
  });
});

