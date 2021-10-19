/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import path, { dirname } from "path";
import { fileURLToPath } from "url";

import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const target = process.env.PLATFORM === "node" ? "node"
  : ["webext", "web"].includes(process.env.PLATFORM) ? "web"
  : null;

if (target === null) {
  throw new Error(
    `Attempted to build benchmars script for unknown platform: ${process.env.PLATFORM}`
  );
}

export default {
  target,
  entry: {
    max: path.resolve(__dirname, "max.js"),
    min: path.resolve(__dirname, "min.js"),
  },
  mode: "production",
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: "json"
    })
  ],
  resolve: {
    alias: {
      "GLEAN": path.resolve(
        __dirname,
        `../node_modules/@mozilla/glean/dist/index/${process.env.PLATFORM}.js`
      )
    },
    // Do not try to import Node.js modules.
    fallback: {
      "util": false
    }
  },
};
