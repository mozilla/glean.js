/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type PlatformInfo from "../../core/platform_info.js";
import { KnownOperatingSystems } from "../../core/platform_info.js";

// The `Qt` symbol can be used in this file without TS compiler errors
// because that symbol is described as a constant in `./types/Qt/index.d.ts`.

const QtPlatformInfo: PlatformInfo = {
  // eslint-disable-next-line @typescript-eslint/require-await
  async os(): Promise<KnownOperatingSystems> {
    // Possible values are listed in https://doc.qt.io/qt-5/qml-qtqml-qt.html#platform-prop
    const osName = Qt.platform.os;
    switch(osName) {
    case "android":
      return KnownOperatingSystems.Android;
    case "ios":
      return KnownOperatingSystems.iOS;
    case "tvos":
      return KnownOperatingSystems.TvOS;
    case "linux":
      return KnownOperatingSystems.Linux;
    case "osx":
      return KnownOperatingSystems.MacOS;
    case "qnx":
      return KnownOperatingSystems.Qnx;
    case "windows":
    case "winrt":
      return KnownOperatingSystems.Windows;
    case "wasm":
      return KnownOperatingSystems.Wasm;
    default:
      return KnownOperatingSystems.Unknown;
    }
  },

  async osVersion(): Promise<string> {
    // This data point is not available in Qt QML.
    return Promise.resolve("Unknown");
  },

  async arch(): Promise<string> {
    // This data point is not available in Qt QML.
    return Promise.resolve("Unknown");
  },

  async locale(): Promise<string> {
    const locale = Qt.locale();
    return Promise.resolve(locale ? locale.name : "und");
  }
};

export default QtPlatformInfo;
