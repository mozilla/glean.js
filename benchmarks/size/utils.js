/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";

import webpack from "webpack";

import config from "./webpack.config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const METRIC_TYPES = [
  "boolean",
  "counter",
  "datetime",
  "event",
  "labeled",
  "quantity",
  "string",
  "text",
  "timespan",
  "rate",
  "uuid",
  "url",
];

export const PLUGINS = [ "encryption" ];

export const PLATFORMS = [ "web", "webext", "node" ];

const UNITS = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
/**
 * Formats a given number of bytes.
 *
 * Copied from:
 * https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
 *
 * @param {number} bytes The number of bytes to format.
 * @returns A formatted representation of the bytes given.
 */
export function formatBytes(bytes) {
  let l = 0, n = parseInt(bytes, 10) || 0;
  while(n >= 1024 && ++l){
    n = n/1024;
  }
  return(n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + UNITS[l]);
}

/**
 * Executes an arbitrary command.
 *
 * @param {string} cmd The command to execute.
 * @returns A promise which executes once the command is complete. Will resolve even in case of errors.
 */
export function executeCmd(cmd) {
  console.log("Executing command:", cmd);
  return new Promise((resolve, reject) => {
    exec(cmd, (error, _, stderr) => {
      if (error) {
          console.log("Error:", error);
      }
      if (stderr) {
          console.log("Stderr:", stderr);
      }

      resolve();
    });
  });
}

/**
 * Builds a custom bundle of Glean.js + an optional array of metric types and plugins.
 *
 * Note: This function will use whatever `@mozilla/glean` package is linked at its runtime.
 *
 * @param {string} platform The platform to build for, supported platforms are: `web`, `webext` and `node`.
 *        The Qt build always has the same size because it always includes everything in it,
 *        so it is not supported here.
 * @param {[string]} metrics An array of metric types. Supported metrics types are listed in `METRIC_TYPES`.
 *        If not provided the final bundle won't contain any additional metric types.
 * @param {[string]} plugins An array of plugins. Supported plugins are listed in `PLUGINS`.
 *        If not provided the final bundle won't contain any additional plugins.
 * @returns A number representing the size in bytes of the generated bundle.
 */
export async function getCustomLibSize(platform, metrics = [], plugins = []) {
  console.log(
    `Creating a custom build for the "${platform}" platform.`,
    `${metrics.length ? `Importing the ${metrics.join(",")} metric types.` : "Without extra metrics types."}`,
    `${plugins.length ? `Importing the ${plugins.join(",")} plugins.` : "Without any plugins."}`
  );

  // Generate custom code importing the given metrics and plugins.
  const code =
    `import Glean from "@mozilla/glean/${platform}";
    ${metrics
        .map(metric => `import ${metric} from "@mozilla/glean/private/metrics/${metric}";`)
        .join("\n")}
    ${plugins
        .map(plugin => `import ${plugin} from "@mozilla/glean/plugins/${plugin}";`)
        .join("\n")}

    console.log(JSON.stringify(Glean));
    ${metrics
      .map(metric => `console.log(JSON.stringify(${metric}));`)
      .join("\n")}
    ${plugins
      .map(plugin => `console.log(JSON.stringify(${plugin}));`)
      .join("\n")}
  `;

  // Create the tmp directory if it doesn't exist.
  const tmpDir = path.join(__dirname, "tmp");
  if (!fs.existsSync(tmpDir)){
    fs.mkdirSync(tmpDir);
  }

  // Create a file with custom code as content.
  const outputFilePath = path.join(tmpDir, "glean.lib.js")
  await new Promise((resolve, reject) => {
    fs.writeFile(outputFilePath, code, err => {
      if (err) reject(err);

      resolve();
    });
  });

  // Build the library and return the size of the asset generated.
  const customConfig = config(platform, outputFilePath);
  return await new Promise((resolve, reject) => {
    webpack(
      customConfig,
      (err, stats) => {
        if (err || stats.hasErrors()) reject(err)

        const statsJSON = stats.toJson();
        resolve(statsJSON.entrypoints.main.assetsSize);
      }
    );
  });
}

/**
 * Gets the size of the Qt bundle directly from the Glean folder.
 *
 * Note: this function assumes the Qt bundle has been built over there.
 *
 * @returns The size in bytes of the Qt bundle.
 */
export function getQtBundleSize() {
  // The Qt bundle size is special, because the Qt build is not part of the @mozilla/glean npm package.
  // It is already bundled and distributed with each new release on the Github releases page.
  //
  // In Qt, the bundle always contains all metric types and plugins, so there is no min/max.
  return fs.statSync(path.resolve(__dirname, "../../glean/dist/qt/org/mozilla/Glean/glean.lib.js")).size;
}
