/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export default (platform, entry) => {
  const target = platform === "web" ? "web" : null;

  return {
    target,
    entry,
    output: {
      clean: true,
    },
    mode: "production",
    resolve: {
      // Do not try to import Node.js modules.
      fallback: {
        "util": false
      }
    },
  };
}
