/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Store from "core/storage"
import Uploader from "core/upload/uploader";
import PlatformInfo from "core/platform_info";

/**
 * An interface describing all the platform specific APIs Glean.js needs to access.
 *
 * Each supported platform must provide an implementation of this interface.
 */
interface Platform {
  // The platformironment speficic storage implementation
  Storage: new (rootKey: string) => Store,
  // The platformironment specific uploader implementation
  uploader: Uploader,
  // The platformironment specifici implemtation of platform information getters
  info: PlatformInfo,
}

export default Platform;
