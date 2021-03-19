/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import MockStorage from "../test/storage.js";
import { UploadResult, UploadResultStatus } from "../../core/upload/index.js";
import PlatformInfo, { KnownOperatingSystems } from "../../core/platform_info.js";
import Uploader from "../../core/upload/uploader.js";
import Platform from "../index.js";

class MockUploader extends Uploader {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  post(_url: string, _body: string, _headers?: Record<string, string>): Promise<UploadResult> {
    const result: UploadResult = {
      result: UploadResultStatus.Success,
      status: 200
    };
    return Promise.resolve(result);
  }
}

const MockPlatformInfo: PlatformInfo = {
  os(): Promise<KnownOperatingSystems> {
    return Promise.resolve(KnownOperatingSystems.Unknown);
  },

  osVersion(): Promise<string> {
    return Promise.resolve("Unknown");
  },

  arch(): Promise<string> {
    return Promise.resolve("Unknown");
  },

  locale(): Promise<string> {
    return Promise.resolve("Unknown");
  },
};

const TestPlatform: Platform = {
  Storage: MockStorage,
  uploader: new MockUploader(),
  info: MockPlatformInfo,
};

export default TestPlatform;
