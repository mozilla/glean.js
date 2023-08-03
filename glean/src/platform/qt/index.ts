/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Qt does not have its implementations yet, we use pieces of
// the `TestPlatform` so that the sample will still work.
import type Platform from "../async.js";

import uploader from "./uploader.js";
import info from "./platform_info.js";
import Storage from "./storage.js";

const QtPlatform: Platform = {
  Storage,
  uploader,
  info,
  timer: {
    // TODO(bug1743140): Actually implement these functions here.
    setTimeout: () => { throw new Error(); },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    clearTimeout: () => {}
  },
  name: "Qt"
};

export default QtPlatform;
