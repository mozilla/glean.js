/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { UploadTask } from "../task.js";
import type { UploadResult } from "../uploader.js";
import type {
  Observer as PingsDatabaseObserver,
  PingInternalRepresentation
} from "../../pings/database/shared.js";
import type { OptionalAsync } from "../../types.js";

export const UPLOAD_MANAGER_LOG_TAG = "core.Upload.PingUploadManager";

export interface QueuedPing extends PingInternalRepresentation {
  // The UUID identifier for this ping.
  readonly identifier: string;
}

/**
 * A ping upload manager. Manages a queue of pending pings to upload.
 *
 * Observes the pings database
 * and whenever that is updated the newly recorded ping is enqueued.
 */
export interface IPingUploadManager extends PingsDatabaseObserver {
  /**
   * Get the next `UploadTask`.
   *
   * @returns The next upload task.
   */
  getUploadTask(): OptionalAsync<UploadTask>;

  /**
   * Processes the response from an attempt to upload a ping.
   *
   * Based on the HTTP status of said response,
   * the possible outcomes are:
   *
   * 200 - 299 Success**
   *   Any status on the 2XX range is considered a successful upload,
   *   which means the corresponding ping file can be deleted.
   *
   *   _Known 2XX status:_
   *   200 - OK. Request accepted into the pipeline.
   *
   * 400 - 499 Unrecoverable error**
   *   Any status on the 4XX range means something our client did is not correct.
   *   It is unlikely that the client is going to recover from this by retrying,
   *   so in this case the corresponding ping file can also be deleted.
   *
   *   _Known 4XX status:_
   *   404 - not found - POST/PUT to an unknown namespace
   *   405 - wrong request type (anything other than POST/PUT)
   *   411 - missing content-length header
   *   413 - request body too large Note that if we have badly-behaved clients that
   *           retry on 4XX, we should send back 202 on body/path too long).
   *   414 - request path too long (See above)
   *
   * Any other error**
   *   For any other error, a warning is logged and the ping is re-enqueued.
   *
   *   _Known other errors:_
   *   500 - internal error
   *
   * @param ping The ping that was just uploaded.
   * @param response The response of a ping upload attempt.
   * @returns Whether or not to retry the upload attempt.
   */
  processPingUploadResponse(ping: QueuedPing, response: UploadResult): OptionalAsync<void>;

  /**
   * Clears the pending pings queue.
   *
   * # Important
   *
   * This will _drop_ pending pings still enqueued.
   * Only the `deletion-request` ping will still be processed.
   *
   * @returns A promise which resolves once the clearing is complete
   *          and all upload attempts have been exhausted.
   */
  clearPendingPingsQueue(): OptionalAsync<void>;

  /**
   * Enqueues a new ping and trigger uploading of enqueued pings.
   *
   * This function is called by the PingDatabase every time a new ping is added to the database
   * or when the database is being scanned.
   *
   * @param identifier The id of the ping that was just recorded.
   * @param ping An object containing the newly recorded ping path, payload and optionally headers.
   */
  update(identifier: string, ping: PingInternalRepresentation): OptionalAsync<void>;
}
