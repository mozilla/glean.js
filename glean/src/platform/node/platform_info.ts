/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import os from "os";

import type PlatformInfo from "../../core/platform_info/async.js";
import { KnownOperatingSystems } from "../../core/platform_info/shared.js";

const NodePlatformInfo: PlatformInfo = {
  async os(): Promise<KnownOperatingSystems> {
    // Possible values are listed in https://nodejs.org/api/process.html#process_process_platform
    switch(process.platform) {
    case "darwin":
      return Promise.resolve(KnownOperatingSystems.MacOS);
    case "win32":
      return Promise.resolve(KnownOperatingSystems.Windows);
    case "android":
      return Promise.resolve(KnownOperatingSystems.Android);
    case "freebsd":
      return Promise.resolve(KnownOperatingSystems.FreeBSD);
    case "linux":
      return Promise.resolve(KnownOperatingSystems.Linux);
    case "openbsd":
      return Promise.resolve(KnownOperatingSystems.OpenBSD);
    case "aix":
      return Promise.resolve(KnownOperatingSystems.AIX);
    default:
      return Promise.resolve(KnownOperatingSystems.Unknown);
    }
  },

  async osVersion(): Promise<string> {
    // Note: `os.release()` returns the _kernel_, not OS version.
    // That is the best Node.js will give us, so we will take it.
    return Promise.resolve(os.release() || "Unknown");
  },

  async arch(): Promise<string> {
    return Promise.resolve(os.arch() || "Unknown");
  },

  async locale(): Promise<string> {
    return Promise.resolve(Intl.DateTimeFormat().resolvedOptions().locale || "und");
  }
};

export default NodePlatformInfo;
