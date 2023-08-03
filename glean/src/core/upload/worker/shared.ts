/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export const PING_UPLOAD_WORKER_LOG_TAG = "core.Upload.PingUploadWorker";

// Error to be thrown in case the final ping body is larger than MAX_PING_BODY_SIZE.
export class PingBodyOverflowError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "PingBodyOverflow";
  }
}
