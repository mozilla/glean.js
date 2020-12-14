/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Database from "database";

class Glean {
  // The metrics database.
  db: Database;
  // Whether or not to record metrics.
  uploadEnabled: boolean;

  constructor() {
    this.db = new Database();
    // Temporarily setting this to true always, until Bug 1677444 is resolved.
    this.uploadEnabled = true;
  }
}

export default Glean;
