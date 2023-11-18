/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { gzipSync, strToU8 } from "fflate";
import { PingBodyOverflowError } from "./ping_body_overflow_error.js";

/**
 * Represents a payload to be transmitted by an uploading mechanism.
 */
export default class PingRequest<BodyType extends string | Uint8Array> {
  constructor (
    readonly identifier: string,
    readonly headers: Record<string, string>,
    readonly payload: BodyType,
    readonly maxBodySize: number
  ) {}

  asCompressedPayload(): PingRequest<string | Uint8Array> {
    // If this is already gzipped, do nothing.
    if (this.headers["Content-Encoding"] == "gzip") {
      return this;
    }

    const stringifiedBody = JSON.stringify(this.payload);
    // We prefer using `strToU8` instead of TextEncoder directly,
    // because it will polyfill TextEncoder if it's not present in the environment.
    // Environments that don't provide TextEncoder are IE and most importantly QML.
    const encodedBody = strToU8(stringifiedBody);

    let finalBody: string | Uint8Array;
    const headers = this.headers;
    try {
      finalBody = gzipSync(encodedBody);
      headers["Content-Encoding"] = "gzip";
      headers["Content-Length"] = finalBody.length.toString();
    } catch {
      // Fall back to whatever we had.
      return this;
    }

    if (finalBody.length > this.maxBodySize) {
      throw new PingBodyOverflowError(
        `Body for ping ${this.identifier} exceeds ${this.maxBodySize} bytes. Discarding.`
      );
    }

    return new PingRequest<string | Uint8Array>(this.identifier, headers, finalBody, this.maxBodySize);
  }
}

