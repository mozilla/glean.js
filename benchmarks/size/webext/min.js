/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Glean from "@mozilla/glean/webext";

// We import everything and log it, so that we are sure all imports are used
// and webpack is required to actually include them in the final bundle.
console.log(JSON.stringify(Glean));
