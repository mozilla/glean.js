/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Platform from "../index.js";
import type PlatformInfo from "../../core/platform_info.js";
import type { QtConfigurationInterface } from "./config.js";
import { KnownOperatingSystems } from "../../core/platform_info.js";

class QtPlatformInfo implements PlatformInfo {
  private _config: QtConfigurationInterface;

  constructor(config: QtConfigurationInterface) {
    this._config = config;
  }

  async os(): Promise<KnownOperatingSystems> {
    if (this._config.os) {
      return Promise.resolve(this._config.os);
    }

    return Promise.resolve(KnownOperatingSystems.Unknown);
  }

  async osVersion(): Promise<string> {
    return Promise.resolve(this._config.osVersion ? this._config.osVersion : "Unknown");
  }

  async arch(): Promise<string> {
    return Promise.resolve(this._config.platformArch ? this._config.platformArch : "Unknown");
  }

  async locale(): Promise<string> {
    return Promise.resolve(this._config.locale ? this._config.locale : "Unknown");
  }
}

export default {
  qtToPlatform(config: QtConfigurationInterface): Platform {
    return {
      Storage: config.storageBuilder,
      uploader: config.httpClient,
      info: new QtPlatformInfo(config),
    };
  }
};
