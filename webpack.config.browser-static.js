/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


const path = require("path"); // eslint-disable-line @typescript-eslint/no-var-requires

module.exports = {
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ ".tsx", ".ts", ".js" ],
  },
  output: {
    filename: "glean.js",
    path: path.resolve(__dirname, "dist"),
    library: "Glean",
    // This config makes the Glean object a global `var`.
    // See: https://webpack.js.org/guides/author-libraries/
    libraryTarget: "var",
  }
};
