/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { statSync  } from "fs";

import { request } from "@octokit/request";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import webextStats from "../dist/size/webext/report.json";
import mainWebextStats from "../dist/size/webext/main/report.json";

// The Qt bundle size is special, because the Qt build is not part of the @mozilla/glean npm package.
// It is already bundled and distributed with each new release on the Github releases page.
// We build it over on the `glean/` folder and copy it with specific names to this folder for convenience.
//
// In Qt the bundle always contains all metric types and plugins, so there is no min/max.
const qtBundleStats = statSync(path.resolve(__dirname, "../dist/size/qt/glean.lib.js"));
const mainQtBundleStats = statSync(path.resolve(__dirname, "../dist/size/qt/glean.main.lib.js"));

// Function shamelessly copied from
// https://stackoverflow.com/questions/15900485/correct-way-to-convert-size-in-bytes-to-kb-mb-gb-in-javascript
const UNITS = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
function formatBytes(bytes) {
  let l = 0, n = parseInt(bytes, 10) || 0;
  while(n >= 1024 && ++l){
    n = n/1024;
  }
  return(n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + UNITS[l]);
}

const stats = [
  {
    name: "Web Extension",
    max: webextStats[0].parsedSize,
    min: webextStats[1].parsedSize,
    main: {
      max: mainWebextStats[0].parsedSize,
      min: mainWebextStats[1].parsedSize,
    }
  },
  {
    name: "Qt/QML",
    max: qtBundleStats.size,
    min: qtBundleStats.size,
    main: {
      max: mainQtBundleStats.size,
      min: mainQtBundleStats.size,
    }
  }
];

const bulletPoints = stats.map(build => {
  const increase = build.max - build.main.max;
  const increasePercentage = parseInt(increase / build.main.max * 100, 10);
  if (increasePercentage === 0) {
    return `* **Leave** the size of full **${build.name}** bundle **unchanged**.`
  } else {
    const result = increase > 0 ? "Increase" : "Decrease";
    return `* **${result}** the size of full **${build.name}** bundle build by \`${increasePercentage}%\`.`
  }
});

const tableRows = stats.map(build => {
  const coreIncrease = build.min - build.main.min;
  const fullIncrease = build.max - build.main.max;
  return `| **${build.name}** |
| core only | ${formatBytes(build.main.min)} | ${formatBytes(build.min)} | ${coreIncrease > 0 ? "📈" : "📉"} ${formatBytes(Math.abs(coreIncrease))} |
| full bundle | ${formatBytes(build.main.max)} | ${formatBytes(build.max)} | ${coreIncrease > 0 ? "📈" : "📉"} ${formatBytes(Math.abs(fullIncrease))} |`
});

const report =  `
# Build size report

Merging ${process.env.CIRCLE_PULL_REQUEST} into [main](https://github.com/mozilla/glean.js) will:
${bulletPoints.join("\n")}

---

| | Current size | New size | Size increase |
|--:|:---:|:---:|:---:|
${tableRows.join("\n")}
`;

if (process.env.DRY_RUN) {
  console.log(report);
} else {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error("No Github token configured!")
  }
  await request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
    owner: process.env.CIRCLE_PROJECT_USERNAME,
    repo: process.env.CIRCLE_PROJECT_REPONAME,
    issue_number: process.env.CIRCLE_PR_NUMBER,
    body: report,
    headers: {
      authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
  });
}
