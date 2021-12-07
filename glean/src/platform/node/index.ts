/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Platform from "../index.js";
import PlatformInfo from "./platform_info.js";
import Uploader from "./uploader.js";

// We will still use the TestPlatform as a placeholder
// for the other Node.js modules that have not been implemented yet.
// See Bug 1728807 (Storage).
import TestPlatform from "../test/index.js";

const NodePlatform: Platform = {
  ...TestPlatform,
  uploader: Uploader,
  info: PlatformInfo,
  timer: { setTimeout, clearTimeout },
  name: "node"
};

export default NodePlatform;
