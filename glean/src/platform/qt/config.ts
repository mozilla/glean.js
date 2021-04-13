/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ConfigurationInterface } from "../../core/config.js";
import type { KnownOperatingSystems } from "../../core/platform_info.js";
import type Uploader from "../../core/upload/uploader.js";
import type { StorageBuilder } from "../index.js";

/**
 * Describes how to configure Glean for Qt. This interface extends the standard
 * Glean configuration interface.
 */
export interface QtConfigurationInterface extends ConfigurationInterface {
  os?: KnownOperatingSystems,
  osVersion?: string,
  platformArch?: string,
  locale?: string,

  // The HTTP client implementation to use for uploading pings.
  httpClient: Uploader,

  storageBuilder: StorageBuilder,
}
