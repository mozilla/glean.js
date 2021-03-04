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
  beforeEach(async function() {
    await Glean.testResetGlean("something something");
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("collect and store triggers the AfterPingCollection and deals with possible result correctly", async function () {
    // Disable ping uploading for it not to interfere with this tests.
    sandbox.stub(Glean["pingUploader"], "triggerUpload").callsFake(() => Promise.resolve());

    await Glean.testUninitialize();

    const plugin = new PingEncryptionPlugin({
      "kid": "test",
      "alg": "ECDH-ES",
      "crv": "P-256",
      "kty": "EC",
      "x": "Qqihp7EryDN2-qQ-zuDPDpy5mJD5soFBDZmzPWTmjwk",
      "y": "PiEQVUlywi2bEsA3_5D0VFrCHClCyUlLW52ajYs-5uc"
    });
    await Glean.testInitialize("something something", true, { plugins: [ plugin ]});
    const ping = new PingType({
      name: "ping",
      includeClientId: true,
      sendIfEmpty: true,
    });

    await PingMaker.collectAndStorePing("ident", ping);
    const recordedPing = (await Glean.pingsDatabase.getAllPings())["ident"];
    
    assert.ok("payload" in recordedPing.payload);
  });
});
