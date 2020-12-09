/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const path = require("path");

const baseConfig = require("./webpack.config.shared");

module.exports = {
  ...baseConfig,
  output: {
    ...baseConfig.output,
    libraryTarget: "var",
  },
  resolve: {
    ...baseConfig.resolve,
    alias: {
      // TODO: This is temporary until we actually have a persistent storage impl for Qt.
      // See: [Bug 1681483](https://bugzilla.mozilla.org/show_bug.cgi?id=1681483)
      "storage/persistent": path.resolve(__dirname, "src/storage/weak"),
    }
  }
};
