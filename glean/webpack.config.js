/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const path = require("path");

const base = {
  entry: "./src/index.ts",
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
    path: path.resolve(__dirname, "dist"),
    library: "Glean",
  }
};

const qt = {
  ...base,
  output: {
    ...base.output,
    filename: "qt.js",
    libraryTarget: "var",
  },
  resolve: {
    ...base.resolve,
    alias: {
      "platform/current": path.resolve(__dirname, "src/platform/qt"),
    }
  }
};

const webext = {
  ...base,
  output: {
    ...base.output,
    filename: "webext.js",
    libraryTarget: "umd",
  },
  resolve: {
    ...base.resolve,
    alias: {
      "platform/current": path.resolve(__dirname, "src/platform/webext"),
    }
  }
};

module.exports = [ qt, webext ];
