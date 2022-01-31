/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

import {
  getCustomLibSize,
  formatBytes,
  getQtBundleSize,
  METRIC_TYPES,
  PLUGINS,
  PLATFORMS
} from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getMetricTypesAndPluginsSizesByPlatform(platform) {
  // Get the size of the library without any extras.
  const baseSize = await getCustomLibSize(platform);

  const metricTypesSizes = {};
  for (const type of METRIC_TYPES) {
    const size = await getCustomLibSize(platform, [type]);
    const sizeDiff = size - baseSize;

    // If there is (almost) no size difference,
    // the metric type is already included in the core
    // and doesn't matter for this docs.
    if (sizeDiff > 50) {
      metricTypesSizes[type] = formatBytes(sizeDiff);
    }
  }

  const pluginsSizes = {};
  for (const plugin of PLUGINS) {
    const size = await getCustomLibSize(platform, [], [plugin]);
    const sizeDiff = size - baseSize;

    // If there is (almost) no size difference,
    // the metric type is already included in the core
    // and doesn't matter for this docs.
    if (sizeDiff > 50) {
      pluginsSizes[plugin] = formatBytes(sizeDiff);
    }
  }

  return {
    baseSize: formatBytes(baseSize),
    metricTypesSizes,
    pluginsSizes,
  }
}

try {
  const sizes = {};
  for (const platform of PLATFORMS) {
    sizes[platform] = await getMetricTypesAndPluginsSizesByPlatform(platform);
  }

  if (process.env.DRY_RUN) {
    console.log(sizes)
  } else {
    const minSizesTable =
    `\n|| Size |\n`
    + `|--|--|\n`
    + `${PLATFORMS.map(platform => `|${platform}|**${sizes[platform].baseSize}**|`).join("\n")}\n`
    + `|QML|**${formatBytes(getQtBundleSize())}**|\n`;

    const createSizesTableHeader = title => {
      return `\n|${title}| ${PLATFORMS.map(platform => `${platform}|`).join("")}\n`
      + `|--|${PLATFORMS.map(() => `--|`).join("")}\n`;
    }

    const createSizesTable = key => {
      let table = "";

      const subKeys = Object.keys(sizes[PLATFORMS[0]][key])
      for (const subKey of subKeys) {
        table += `|${subKey}|`;
        for (const platform of PLATFORMS) {
          const size = sizes[platform][key][subKey];
          table += `${size} |`;
        }
        table += `\n`;
      }

      return table;
    }

    const metricTypesSizesTable =
      createSizesTableHeader("Metric Type") + createSizesTable("metricTypesSizes");
    const pluginsSizesTable =
      createSizesTableHeader("Plugin") + createSizesTable("pluginsSizes");

    // Update docs on the README.md with new sizes.
    const docsFilePath = path.join(__dirname, "../../docs/reference/sizes.md");
    const SEPARATOR = "<!-- ! -->";
    fs.readFile(docsFilePath, function(err, data) {
      if(err) throw err;

      console.log("Transforming data into string...");
      data = data.toString();

      // We use this method because regexes would take too long in such a large string.
      console.log("Splitting data into chunks...");
      let chunks = data.split(SEPARATOR);

      chunks[1] = minSizesTable;
      chunks[3] = metricTypesSizesTable;
      chunks[5] = pluginsSizesTable;

      const updatedData = chunks.join(`${SEPARATOR}`);

      console.log("Will update the data...");
      fs.writeFile(docsFilePath, updatedData, function(err) {
          err || console.log('Data updated!');
      });
    });
  }
} catch(e) {
  console.trace(e);
}

