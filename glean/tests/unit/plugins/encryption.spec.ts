/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";
import { generateKeyPair, exportJWK, compactDecrypt } from "jose";

import { InternalPingType as PingType} from "../../../src/core/pings/ping_type";
import type { JSONObject } from "../../../src/core/utils";
import { WaitableUploader } from "../../utils";
import PingEncryptionPlugin from "../../../src/plugins/encryption";
import collectAndStorePing from "../../../src/core/pings/maker/async";
import { makePath } from "../../../src/core/pings/maker/shared";
import CounterMetricType from "../../../src/core/metrics/types/counter";
import { Lifetime } from "../../../src/core/metrics/lifetime";
import { testResetGlean } from "../../../src/core/testing";

const sandbox = sinon.createSandbox();

describe("PingEncryptionPlugin", function() {
  const testAppId = `gleanjs.test.${this.title}`;

  beforeEach(async function() {
    await testResetGlean(testAppId);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it("collect and store triggers the AfterPingCollection and deals with possible result correctly", async function () {
    const pingId = "ident";
    const ping = new PingType({
      name: "test",
      includeClientId: false,
      sendIfEmpty: true,
    });

    const path = makePath(pingId, ping);
    const mockUploader = new WaitableUploader();
    const pingBody = mockUploader.waitForPingSubmission("test", path);

    await testResetGlean(
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
        ],
        httpClient: mockUploader,
      }
    );

    await collectAndStorePing(pingId, ping);
    const pingBodyValue = await pingBody;
    assert.ok("payload" in pingBodyValue);
    assert.ok(typeof pingBodyValue.payload === "string");
  });

  it("decrypting encrypted ping returns expected payload and protected headers", async function () {
    const { publicKey, privateKey } = await generateKeyPair("ECDH-ES");

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

    const httpClient = new WaitableUploader();
    const pingBody = httpClient.waitForPingSubmission("encryptedping");
    await testResetGlean(
      testAppId,
      true,
      {
        plugins: [
          new PingEncryptionPlugin(await exportJWK(publicKey))
        ],
        httpClient,
      },
    );

    counter.add(37);
    ping.submit();

    const { plaintext, protectedHeader } = await compactDecrypt(
      (await pingBody).payload as string,
      privateKey
    );

    const decoder = new TextDecoder();
    const decodedPayload = decoder.decode(plaintext);
    const decodedPayloadObject = JSON.parse(decodedPayload) as JSONObject;

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

