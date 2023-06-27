/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type PlatformInfo from "../../../core/platform_info/async.js";
import { KnownOperatingSystems } from "../../../core/platform_info/shared.js";

const WebExtPlatformInfo: PlatformInfo = {
  async os(): Promise<KnownOperatingSystems> {
    // Possible values are listed in https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/PlatformOs
    const platformInfo = await browser.runtime.getPlatformInfo();
    switch(platformInfo.os) {
    case "mac":
      return KnownOperatingSystems.MacOS;
    case "win":
      return KnownOperatingSystems.Windows;
    case "android":
      return KnownOperatingSystems.Android;
    case "cros":
      return KnownOperatingSystems.ChromeOS;
    case "linux":
      return KnownOperatingSystems.Linux;
    case "openbsd":
      return KnownOperatingSystems.OpenBSD;
    default:
      return KnownOperatingSystems.Unknown;
    }
  },

  async osVersion(): Promise<string> {
    // The only way I found to extract osVersion from the browser was through the userAgent string
    // and that is unreliable enough that I would rather not do it.
    //
    // For web extensions, browser type and version are more important anyways.
    return Promise.resolve("Unknown");
  },

  async arch(): Promise<string> {
    const platformInfo = await browser.runtime.getPlatformInfo();
    // Possible values are: "arm", "x86-32", "x86-64"
    return platformInfo.arch;
  },

  async locale(): Promise<string> {
    return Promise.resolve(navigator.language || "und");
  }
};
export default WebExtPlatformInfo;
