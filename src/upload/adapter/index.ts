/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { UploadResult, UploadResultStatus } from "upload";

/**
 * Uploader interface, actualy uploading logic varies per platform.
 */
export abstract class UploadAdapter {
  // The timeout, in seconds, to use for all operations with the server.
  protected defaultTimeout = 10_000;

  /**
   * Makes a POST request to a given url, with the given headers and body.
   *
   * @param url The URL to make the POST request
   * @param body The stringified body of this post request
   * @param headers Optional header to include in the request
   *
   * @returns The status code of the response.
   */
  abstract post(url: URL, body: string, headers?: Record<string, string>): Promise<UploadResult>;
}

// Default export for tests sake.
class MockUploadAdapter extends UploadAdapter {
  post(): Promise<UploadResult> {
    const result: UploadResult = {
      result: UploadResultStatus.Success,
      status: 200
    };
    return Promise.resolve(result);
  }
}

export default new MockUploadAdapter();
