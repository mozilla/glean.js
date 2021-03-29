/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { UploadResult } from "../upload/index.js";

// The timeout, in milliseconds, to use for all operations with the server.
export const DEFAULT_UPLOAD_TIMEOUT_MS = 10_000;

/**
 * Uploader interface, actualy uploading logic varies per platform.
 */
export interface Uploader {
  /**
   * Makes a POST request to a given url, with the given headers and body.
   *
   * @param url The URL to make the POST request
   * @param body The stringified body of this post request
   * @param headers Optional header to include in the request
   *
   * @returns The status code of the response.
   */
  post(url: string, body: string, headers?: Record<string, string>): Promise<UploadResult>;
}

export default Uploader;
