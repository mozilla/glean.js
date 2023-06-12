/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Glean from "../../core/glean/async.js";
import type Platform from "../../platform/async.js";
import type { IGlean, RestrictedConfigurationInterface } from "./shared.js";

export const baseAsync = (platform: Platform): IGlean => {
  // See `IGlean` for method documentation.
  return {
    initialize(
      applicationId: string,
      uploadEnabled: boolean,
      config?: RestrictedConfigurationInterface
    ): void {
      Glean.setPlatform(platform);
      Glean.initialize(applicationId, uploadEnabled, config);
    },

    setUploadEnabled(flag: boolean): void {
      Glean.setUploadEnabled(flag);
    },

    setLogPings(flag: boolean): void {
      Glean.setLogPings(flag);
    },

    setDebugViewTag(value: string): void {
      Glean.setDebugViewTag(value);
    },

    shutdown(): Promise<void> {
      return Glean.shutdown();
    },

    setSourceTags(value: string[]): void {
      Glean.setSourceTags(value);
    }
  };
};
