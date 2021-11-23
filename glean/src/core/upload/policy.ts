/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Policies for ping storage, uploading and requests.
 */
export default class Policy {
  constructor (
    // The maximum recoverable failures allowed per uploading window.
    //
    // Limiting this is necessary to avoid infinite loops on requesting upload tasks.
    readonly maxRecoverableFailures: number = 3,
    // The maximum size in bytes a ping body may have to be eligible for upload.
    readonly maxPingBodySize: number = 1024 * 1024 // 1MB
  ) {}
}

