/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type PlatformInfoSync from "../../../core/platform_info/sync.js";
import { KnownOperatingSystems } from "../../../core/platform_info/shared.js";

const BrowserPlatformInfo: PlatformInfoSync = {
  os(): KnownOperatingSystems {
    const ua = navigator.userAgent;

    if (ua.includes("Windows")) {
      return KnownOperatingSystems.Windows;
    }

    if (/tvOS/i.test(ua)) {
      return KnownOperatingSystems.TvOS;
    }

    if (/Watch( OS)?/i.test(ua)) {
      return KnownOperatingSystems.WatchOS;
    }

    if (/iPhone|iPad|iOS/i.test(ua)) {
      return KnownOperatingSystems.iOS;
    }

    if (/Mac OS X|macOS/i.test(ua)) {
      return KnownOperatingSystems.MacOS;
    }

    if (/Android/i.test(ua)) {
      return KnownOperatingSystems.Android;
    }

    if (/CrOS/i.test(ua)) {
      return KnownOperatingSystems.ChromeOS;
    }

    if (/WebOS/i.test(ua)) {
      return KnownOperatingSystems.WebOS;
    }

    if (/Linux/i.test(ua)) {
      return KnownOperatingSystems.Linux;
    }

    if (/OpenBSD/i.test(ua)) {
      return KnownOperatingSystems.OpenBSD;
    }

    if (/FreeBSD/i.test(ua)) {
      return KnownOperatingSystems.FreeBSD;
    }

    if (/NetBSD/i.test(ua)) {
      return KnownOperatingSystems.NetBSD;
    }

    if (/SunOS/i.test(ua)) {
      return KnownOperatingSystems.SunOS;
    }

    if (/AIX/i.test(ua)) {
      return KnownOperatingSystems.AIX;
    }

    return KnownOperatingSystems.Unknown;
  },

  osVersion(): string {
    // It would be very unreliable to try and extract OS version information from the UA string.
    return "Unknown";
  },

  arch(): string {
    // It would be very unreliable to try and extract architecture information from the UA string.
    return "Unknown";
  },

  locale(): string {
    return navigator.language || "und";
  }
};

export default BrowserPlatformInfo;
