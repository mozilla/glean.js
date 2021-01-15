/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Uploader interface, actualy uploading logic varies per platform.
 */
export interface UploadAdapter {
  /**
   * Makes a POST request to a given url, with the given headers and body.
   *
   * @param url The URL to make the POST request
   * @param options The optional headers and body to include in the request.
   *
   * @returns The status code of the response.
   */
  post(url: URL, options: {
    headers?: Record<string, string>,
    body: string
  }): Promise<number>;
}

// Default export for tests sake.
const MockUploadAdapter: UploadAdapter = {
  post(): Promise<number> {
    return Promise.resolve(200);
  }
};

export default MockUploadAdapter;
