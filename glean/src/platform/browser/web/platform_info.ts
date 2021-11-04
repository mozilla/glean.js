/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type PlatformInfo from "../../../core/platform_info.js";
import { KnownOperatingSystems } from "../../../core/platform_info.js";

const BrowserPlatformInfo: PlatformInfo = {
  os(): Promise<KnownOperatingSystems> {
    const ua = navigator.userAgent;

    if (ua.includes("Windows")) {
      return Promise.resolve(KnownOperatingSystems.Windows);
    }

    if (/tvOS/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.TvOS);
    }

    if (/Watch( OS)?/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.WatchOS);
    }

    if (/iPhone|iPad|iOS/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.iOS);
    }

    if (/Mac OS X|macOS/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.MacOS);
    }

    if (/Android/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.Android);
    }

    if (/CrOS/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.ChromeOS);
    }

    if (/WebOS/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.WebOS);
    }

    if (/Linux/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.Linux);
    }

    if (/OpenBSD/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.OpenBSD);
    }

    if (/FreeBSD/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.FreeBSD);
    }

    if (/NetBSD/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.NetBSD);
    }

    if (/SunOS/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.SunOS);
    }

    if (/AIX/i.test(ua)) {
      return Promise.resolve(KnownOperatingSystems.AIX);
    }

    return Promise.resolve(KnownOperatingSystems.Unknown);
  },

  async osVersion(): Promise<string> {
    // It would be very unreliable to try and extract OS version information from the UA string.
    return Promise.resolve("Unknown");
  },

  async arch(): Promise<string> {
    // It would be very unreliable to try and extract architecture information from the UA string.
    return Promise.resolve("Unknown");
  },

  async locale(): Promise<string> {
    return Promise.resolve(navigator.language || "und");
  }
};

export default BrowserPlatformInfo;
