/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Database from "database";
import { isUndefined } from "utils";

class Glean {
  // The Glean singleton.
  private static _instance?: Glean;

  // The metrics database.
  private _db: Database;
  // Whether or not to record metrics.
  private _uploadEnabled: boolean;

  private constructor() {
    if (!isUndefined(Glean._instance)) {
      throw new Error(
        `Tried to instantiate Glean through \`new\`.
        Use Glean.instance instead to access the Glean singleton.`);
    }

    this._db = new Database();
    // Temporarily setting this to true always, until Bug 1677444 is resolved.
    this._uploadEnabled = true;
  }

  private static get instance(): Glean {
    if (!Glean._instance) {
      Glean._instance = new Glean();
    }

    return Glean._instance;
  }

  static get db(): Database {
    return Glean.instance._db;
  }

  static get uploadEnabled(): boolean {
    return Glean.instance._uploadEnabled;
  }

  static set uploadEnabled(value: boolean) {
    Glean.instance._uploadEnabled = value;
  }
}

export default Glean;
