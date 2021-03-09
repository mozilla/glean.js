/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import Glean from "../../src/core/glean";
import PingType from "../../src/core/pings";
import * as PingMaker from "../../src/core/pings/maker";
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
    // Disable ping uploading for it not to interfere with this tests.
    sandbox.stub(Glean["pingUploader"], "triggerUpload").callsFake(() => Promise.resolve());

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
      name: "ping",
      includeClientId: true,
      sendIfEmpty: true,
    });
    await PingMaker.collectAndStorePing("ident", ping);
    const recordedPing = (await Glean.pingsDatabase.getAllPings())["ident"];

    assert.ok("payload" in recordedPing.payload);
    assert.strictEqual(Object.keys(recordedPing.payload).length, 1);
  });
});
