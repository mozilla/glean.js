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
    libraryTarget: "umd",
  },
  resolve: {
    ...baseConfig.resolve,
    alias: {
      "storage/persistent": path.resolve(__dirname, "src/storage/persistent/webext"),
      "platform_info": path.resolve(__dirname, "src/platform_info/webext"),
    }
  }
};
