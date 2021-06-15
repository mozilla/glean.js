/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  entry: {
    max: path.resolve(__dirname, "max.js"),
    min: path.resolve(__dirname, "min.js"),
  },
  mode: "production",
  output: {
    path: path.resolve(__dirname, "../../dist/size/webext")
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: "json"
    }),
  ]
};
