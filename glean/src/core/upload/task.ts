/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { QueuedPing } from "./manager";

export const enum UploadTaskTypes {
  Done = "done",
  Wait = "wait",
  Upload = "upload",
}

// A flag signaling that the worker doesn't need to request any more upload tasks at this moment.
//
// There are three possibilities for this scenario:
// * Pending pings queue is empty, no more pings to request;
// * Requester has gotten more than MAX_WAIT_ATTEMPTS `Wait_UploadTask` responses in a row;
// * Requester has reported more than MAX_RECOVERABLE_FAILURES_PER_UPLOADING_WINDOW
//   recoverable upload failures on the same uploading window (see below)
//   and should stop requesting at this moment.
//
// An "uploading window" starts when a requester gets a new
// `Upload_UploadTask` response and finishes when they
// finally get a `Done_UploadTask` or `Wait_UploadTask` response.
type Done_UploadTask = {
  type: UploadTaskTypes.Done
};

// A flag signaling that the pending pings directories are not done being processed,
// thus the worker should wait and come back later.
//
// Contains the amount of time in milliseconds
// the requester should wait before requesting a new task.
type Wait_UploadTask = {
  type: UploadTaskTypes.Wait,
  remainingTime: number,
};

// A flag signaling there are no remaining upload tasks and worker is done (for now).
type Upload_UploadTask = {
  type: UploadTaskTypes.Upload,
  ping: QueuedPing,
};

// The possible upload tasks to be performed by a `PingUploadWorker`.
//
// When asking for the next ping request to upload,
// the requester may receive one out of three possible tasks.
export type UploadTask = Done_UploadTask | Wait_UploadTask | Upload_UploadTask;

export default {
  done: (): Done_UploadTask => ({
    type: UploadTaskTypes.Done
  }),

  wait: (remainingTime: number): Wait_UploadTask => ({
    type: UploadTaskTypes.Wait,
    remainingTime,
  }),

  upload: (ping: QueuedPing): Upload_UploadTask => ({
    type: UploadTaskTypes.Upload,
    ping,
  }),
};
