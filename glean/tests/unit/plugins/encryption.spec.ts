/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import generateKeyPair from "jose/util/generate_key_pair";
import fromKeyLike from "jose/jwk/from_key_like";
import compactDecrypt from "jose/jwe/compact/decrypt";

import Glean from "../../../src/core/glean";
import PingType from "../../../src/core/pings/ping_type";
import type { JSONObject } from "../../../src/core/utils";
import TestPlatform from "../../../src/platform/test";
import PingEncryptionPlugin from "../../../src/plugins/encryption";
import collectAndStorePing, { makePath } from "../../../src/core/pings/maker";
import type { UploadResult} from "../../../src/core/upload/uploader";
import type Uploader from "../../../src/core/upload/uploader";
import { UploadResultStatus } from "../../../src/core/upload/uploader";
import CounterMetricType from "../../../src/core/metrics/types/counter";
import { Lifetime } from "../../../src/core/metrics/lifetime";
import { Context } from "../../../src/core/context";

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
      sinon.match(makePath(Context.applicationId, pingId, ping)),
      sinon.match.string
    );

    await collectAndStorePing(pingId, ping);
    assert.ok(postSpy.calledOnce);

    const payload = JSON.parse(postSpy.args[0][1]) as JSONObject;
    assert.ok("payload" in payload);
    assert.ok(typeof payload.payload === "string");
  });

  it("decrypting encrypted ping returns expected payload and protected headers", async function () {
    const { publicKey, privateKey } = await generateKeyPair("ECDH-ES");

    // If we could use `Promise.defer()` (not cross-browser and deprecated), the following
    // block of code would not be needed. We're basically replicating the deferred promise
    // because we need to wait for the `post` method to be called in order to evaluate
    // the arguments. Doing this with `sinon` alone would require us to use the `Glean.dispatcher`
    // internals, which would defeat the point of having a custom uploader.
    type UploadSignature = {url: string, body: string, headers?: Record<string, string>};
    let uploadPromiseResolve: (value: UploadSignature) => void;
    const uploadPromise = new Promise<UploadSignature>(r => uploadPromiseResolve = r);

    class MockUploader implements Uploader {
      post(url: string, body: string, headers?: Record<string, string>): Promise<UploadResult> {
        uploadPromiseResolve({url, body, headers});
        const result: UploadResult = {
          result: UploadResultStatus.Success,
          status: 200
        };
        return Promise.resolve(result);
      }
    }

    await Glean.testResetGlean(
      testAppId,
      true,
      {
        plugins: [
          new PingEncryptionPlugin(await fromKeyLike(publicKey))
        ],
        debug: {
          logPings: true
        },
        httpClient: new MockUploader(),
      },
    );

    const ping = new PingType({
      name: "encryptedping",
      includeClientId: true,
      sendIfEmpty: true,
    });

    const counter = new CounterMetricType({
      category: "test",
      name: "encryptedCount",
      sendInPings: ["encryptedping"],
      lifetime: Lifetime.Ping,
      disabled: false
    });

    counter.add(37);
    ping.submit();

    const { url, body } = await uploadPromise;

    const parsedBody = JSON.parse(body) as JSONObject;
    const { plaintext, protectedHeader } = await compactDecrypt(
      parsedBody?.payload as string,
      privateKey
    );

    const decoder = new TextDecoder();
    const decodedPayload = decoder.decode(plaintext);
    const decodedPayloadObject = JSON.parse(decodedPayload) as JSONObject;

    // Check that this is the ping we were looking for.
    assert.ok(url.includes("encryptedping"));

    // Do basic sanity checking on the ping payload.
    assert.notStrictEqual(decodedPayloadObject["client_info"], undefined);
    assert.notStrictEqual(decodedPayloadObject["ping_info"], undefined);
    assert.ok(decodedPayload.includes("\"test.encryptedCount\":37"));

    // Validate the protected headers.
    assert.ok("kid" in protectedHeader);
    assert.ok("alg" in protectedHeader);
    assert.ok("enc" in protectedHeader);
    assert.ok("typ" in protectedHeader);
  });
});
