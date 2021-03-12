/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import generateKeyPair from "jose/util/generate_key_pair";
import fromKeyLike from "jose/jwk/from_key_like";
import compactDecrypt from "jose/jwe/compact/decrypt";

import Glean from "../../src/core/glean";
import PingType from "../../src/core/pings";
import { JSONObject } from "../../src/core/utils";
import TestPlatform from "../../src/platform/qt";
import PingEncryptionPlugin from "../../src/plugins/encryption";
import collectAndStorePing, { makePath } from "../../src/core/pings/maker";

const sandbox = sinon.createSandbox();

describe("PingEncryptionPlugin", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await Glean.testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("collect and store triggers the AfterPingCollection and deals with possible result correctly", async function () {

    await Glean.testResetGlean(
      testAppId,
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

    const postSpy = sandbox.spy(TestPlatform.uploader, "post").withArgs(
      sinon.match(makePath(pingId, ping)),
      sinon.match.string
    );

    await collectAndStorePing(pingId, ping);
    assert.ok(postSpy.calledOnce);

    const payload = JSON.parse(postSpy.args[0][1]) as JSONObject;
    assert.ok("payload" in payload);
    assert.ok(typeof payload.payload === "string");
  });

  it("decrypting encrypted ping returns expected payload and protected headers", async function () {
    // Disable ping uploading for it not to interfere with this tests.
    sandbox.stub(Glean["pingUploader"], "triggerUpload").callsFake(() => Promise.resolve());

    const { publicKey, privateKey } = await generateKeyPair("ECDH-ES");

    await Glean.testResetGlean(
      testAppId,
      true,
      {
        plugins: [
          new PingEncryptionPlugin(await fromKeyLike(publicKey))
        ],
        debug: {
          logPings: true
        }
      }
    );

    const ping = new PingType({
      name: "test",
      includeClientId: true,
      sendIfEmpty: true,
    });
    const pingId = "ident";

    const consoleSpy = sandbox.spy(console, "info");
    await collectAndStorePing(pingId, ping);

    const preEncryptionPayload = JSON.parse(consoleSpy.lastCall.args[0]) as JSONObject;
    const encryptedPayload = (await Glean.pingsDatabase.getAllPings())[pingId]["payload"]["payload"];

    const { plaintext, protectedHeader } = await compactDecrypt(
      encryptedPayload as string,
      privateKey
    );
    const decoder = new TextDecoder();
    const decodedPayload = JSON.parse(decoder.decode(plaintext)) as JSONObject;

    assert.deepStrictEqual(decodedPayload, preEncryptionPayload);
    assert.ok("kid" in protectedHeader);
    assert.ok("alg" in protectedHeader);
    assert.ok("enc" in protectedHeader);
    assert.ok("typ" in protectedHeader);
  });
});
