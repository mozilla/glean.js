/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Qt does not have its implementations yet, we use pieces of
// the `TestPlatform` so that the sample will still work.
import type Platform from "../index.js";
import TestPlatform from "../test/index.js";
import info from "./platform_info.js";

const QtPlatform: Platform = {
  Storage: TestPlatform.Storage,
  uploader: TestPlatform.uploader,
  info,
  name: "Qt"
};

export default QtPlatform;
