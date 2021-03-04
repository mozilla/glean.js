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
      e: "AQAB",
      n: "qpzYkTGRKSUcd12hZaJnYEKVLfdEsqu6HBAxZgRSvzLFj_zTSAEXjbf3fX47MPEHRw8NDcEXPjVOz84t4FTXYF2w2_LGWfp_myjV8pR6oUUncJjS7DhnUmTG5bpuK2HFXRMRJYz_iNR48xRJPMoY84jrnhdIFx8Tqv6w4ZHVyEvcvloPgwG3UjLidP6jmqbTiJtidVLnpQJRuFNFQJiluQXBZ1nOLC7raQshu7L9y0IatVU7vf0BPnmuSkcNNvmQkSta6ODQBPaL5-o5SW8H37vQjPDkrlJpreViNa3jqP5DB5HYUO-DMh4FegRv9gZWLDEvXpSd9A13YXCa9Q8K_w",
      kty: "RSA",
      alg: "RSA-OAEP-256"
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
