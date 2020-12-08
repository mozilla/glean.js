/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: { onlyCompileBundledFiles: true }
      },
    ],
  },
  resolve: {
    modules: ["node_modules", "src"],
    extensions: [ ".tsx", ".ts", ".js" ]
  },
  output: {
    filename: "glean.js",
    path: path.resolve(__dirname, "dist"),
    library: "Glean",
  }
};
