/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Glean from "../../src/core/glean";
import PingType from "../../src/core/pings";
import * as PingMaker from "../../src/core/pings/maker";
import { JSONObject } from "../../src/core/utils";
import TestPlatform from "../../src/platform/qt";
import PingEncryptionPlugin from "../../src/plugins/encryption";

const sandbox = sinon.createSandbox();

describe("PingEncryptionPlugin", function() {
  // eslint-disable-next-line mocha/no-hooks-for-single-case
  beforeEach(async function() {
    await Glean.testResetGlean("something something");
  });

  // eslint-disable-next-line mocha/no-hooks-for-single-case
  afterEach(function () {
    sandbox.restore();
  });

  it("collect and store triggers the AfterPingCollection and deals with possible result correctly", async function () {
    await Glean.testUninitialize();
    await Glean.testInitialize(
      "something something",
      true,
      {
        plugins: [
          new PingEncryptionPlugin({
            "crv": "P-256",
            "kid": "test",
            "kty": "EC",
            "x": "Q20tsJdrryWJeuPXTM27wIPb_YbsdYPpkK2N9O6aXwM",
            "y": "1onW1swaCcN1jkmkIwhXpCm55aMP8GRJln5E8WQKLJk"
          })
        ]
      }
    );

    const ping = new PingType({
      name: "test",
      includeClientId: true,
      sendIfEmpty: true,
    });
    const pingId = "ident";

    const testPingSpy = sandbox.spy(TestPlatform.uploader, "post").withArgs(
      sinon.match(PingMaker.makePath(pingId, ping)),
      sinon.match.string
    );

    await PingMaker.collectAndStorePing(pingId, ping);
    assert.ok(testPingSpy.calledOnce);

    const payload = JSON.parse(testPingSpy.args[0][1]) as JSONObject;
    assert.ok("payload" in payload);
    assert.ok(typeof payload.payload === "string");
  });
});
