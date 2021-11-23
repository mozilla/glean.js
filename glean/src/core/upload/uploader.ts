/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// The timeout, in milliseconds, to use for all operations with the server.
export const DEFAULT_UPLOAD_TIMEOUT_MS = 10_000;

/**
 * The resulting status of an attempted ping upload.
 */
export const enum UploadResultStatus {
  // A recoverable failure.
  //
  // During upload something went wrong,
  // e.g. the network connection failed.
  // The upload should be retried at a later time.
  RecoverableFailure,
  // An unrecoverable upload failure.
  //
  // A possible cause might be a malformed URL.
  UnrecoverableFailure,
  // Request was successfull.
  //
  // This can still indicate an error, depending on the status code.
  Success,
}

/**
 * The result of an attempted ping upload.
 */
export class UploadResult {
  constructor(
    // The status of an upload attempt
    readonly result: UploadResultStatus,
    // The status is only present if `result` is UploadResultStatus.Success
    readonly status?: number
  ) {}
}

/**
 * Uploader abstract class, actualy uploading logic varies per platform.
 */
export abstract class Uploader {
  /**
   * Makes a POST request to a given url, with the given headers and body.
   *
   * @param url The URL to make the POST request
   * @param body The body of this post request. The body may be a stringified JSON or, most likely,
   *        a Uint8Array containing the gzipped version of said stringified JSON. We need to accept
   *        both in case the compression fails.
   * @param headers Optional headers to include in the request
   * @returns The status code of the response.
   */
  abstract post(url: string, body: string | Uint8Array, headers?: Record<string, string>): Promise<UploadResult>;
}

export default Uploader;
