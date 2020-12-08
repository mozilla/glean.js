/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Importing this here just so the size increase will show on the PR comments,
// once everything is implemented we remove it.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import StorageWeak from "storage/weak";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import StoragePersistent from "storage/persistent";

console.log(
  StorageWeak,
  StoragePersistent
);

export = {
  /**
   * Initializes Glean.
   *
   * Before calling this function Glean.js won't submit any pings.
   *
   * @param appId  Analogous to a Glean SDK application id.
   * @param uploadEnabled Whether upload is enabled or not.
   */
  initialize(appId: string, uploadEnabled: boolean): void {
    console.info(`Called Glean.initialize("${appId}", ${uploadEnabled})).`);
  },

  /**
   * Enables / Disables upload.
   *
   * @param flag Whether to disable or enable upload.
   */
  setUploadEnabled(flag: boolean): void {
    console.info(`Called Glean.setUploadEnabled(${flag})).`);
  }
}
