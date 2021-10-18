/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Platform from "../../index.js";
import uploader from "../uploader.js";

// We will still use the TestPlatform as a placeholder
// for the other web modules that have not been implemented yet.
// See Bug 1726726 (Storage).
import TestPlatform from "../../test/index.js";

const WebPlaftorm: Platform = {
  ...TestPlatform,
  uploader,
  name: "web"
};

export default WebPlaftorm;
