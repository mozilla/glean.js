/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import PlatformInfo from "./platform_info.js";
import type Platform from "../index.js";

// We will still use the TestPlatform as a placeholder
// for the other Node.js modules that have not been implemented yet.
import TestPlatform from "../test/index.js";

const NodePlatform: Platform = {
  ...TestPlatform,
  info: PlatformInfo,
};

export default NodePlatform;
