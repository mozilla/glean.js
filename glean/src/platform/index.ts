/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Store from "../core/storage/index.js";
import type Uploader from "../core/upload/uploader.js";
import type PlatformInfo from "../core/platform_info.js";

export type StorageBuilder = new (rootKey: string) => Store;

/**
 * An interface describing all the platform specific APIs Glean.js needs to access.
 *
 * Each supported platform must provide an implementation of this interface.
 */
interface Platform {
  // The environment speficic storage implementation
  Storage: StorageBuilder,
  // The environment specific uploader implementation
  uploader: Uploader,
  // The environment specifici implemtation of platform information getters
  info: PlatformInfo,
  // The name of the platform, useful for logging and debugging purposes.
  name: string,
}

export default Platform;
