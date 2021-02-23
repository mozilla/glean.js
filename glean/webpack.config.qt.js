/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const path = require("path");

module.exports = {
  entry: "./src/index/qt.ts",
  module: {
    rules: [
      {
        loader: "ts-loader",
        options: {
          configFile: path.resolve(__dirname, "tsconfig/qt/index.json"),
        }
      },
    ],
  },
  resolve: {
    modules: ["node_modules", "src"],
    extensions: [ ".tsx", ".ts", ".js" ]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "glean.js",
    libraryTarget: "var",
    library: "Glean",
  }
};
