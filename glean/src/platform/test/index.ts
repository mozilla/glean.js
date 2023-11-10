/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Platform from "../index.js";
import type PlatformInfo from "../../core/platform_info.js";

import MockStorage from "../test/storage.js";
import { KnownOperatingSystems } from "../../core/platform_info.js";
import Uploader from "../../core/upload/uploader.js";
import { UploadResultStatus, UploadResult } from "../../core/upload/uploader.js";

class MockUploader extends Uploader {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  post(_url: string, _body: string | Uint8Array, _headers?: Record<string, string>): Promise<UploadResult> {
    const result = new UploadResult(UploadResultStatus.Success, 200);
    return Promise.resolve(result);
  }
}

const MockPlatformInfo: PlatformInfo = {
  os(): KnownOperatingSystems {
    return KnownOperatingSystems.Unknown;
  },

  osVersion(): string {
    return "Unknown";
  },

  arch(): string {
    return "Unknown";
  },

  locale(): string {
    return "Unknown";
  },
};

const safeSetTimeout = typeof setTimeout !== "undefined" ? setTimeout : () => { throw new Error(); };
// eslint-disable-next-line @typescript-eslint/no-empty-function
const safeClearTimeout = typeof clearTimeout !== "undefined" ? clearTimeout : () => {};

const TestPlatform: Platform = {
  Storage: MockStorage,
  uploader: new MockUploader(),
  info: MockPlatformInfo,
  timer: { setTimeout: safeSetTimeout, clearTimeout: safeClearTimeout },
  name: "test"
};

export default TestPlatform;
