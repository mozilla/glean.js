/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const path = require("path");

module.exports = {
  entry: {
    background: path.resolve(__dirname, "background.js"),
    content: path.resolve(__dirname, "content.js")
  },
  devtool: "cheap-module-source-map",
  output: {
    filename: "[name].bundle.js"
  }
};
