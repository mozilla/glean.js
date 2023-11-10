/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { IPlatformInfo, KnownOperatingSystems } from "../platform_info/shared.js";

// See `IPlatformInfo` for method documentation.
interface PlatformInfoSync extends IPlatformInfo {
  os(): KnownOperatingSystems;
  osVersion(): string;
  arch(): string;
  locale(): string;
}

export default PlatformInfoSync;
