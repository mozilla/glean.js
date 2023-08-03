/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { request } from "@octokit/request";

import {
  METRIC_TYPES,
  PLUGINS,
  getCustomLibSize,
  formatBytes,
  executeCmd,
  getQtBundleSize
} from "./utils.js";

async function buildStatsMap() {

  const qtBundleStats = getQtBundleSize();
  return [
    {
      name: "Web Extension",
      max: await getCustomLibSize("webext", METRIC_TYPES, PLUGINS),
      min: await getCustomLibSize("webext")
    },
    {
      name: "Website",
      max: await getCustomLibSize("web", METRIC_TYPES, PLUGINS),
      min: await getCustomLibSize("web")
    },
    {
      name: "Node.js",
      max: await getCustomLibSize("node", METRIC_TYPES, PLUGINS),
      min: await getCustomLibSize("node")
    },
    {
      name: "Qt/QML",
      max: qtBundleStats,
      min: qtBundleStats
    }
  ];
}

try {
  console.log("Build and link Glean.js from the main branch.");
  await executeCmd("npm run link:glean:main");

  const mainStats = await buildStatsMap();

  console.log("Build and link Glean.js from the current branch.");
  await executeCmd("npm run link:glean");
  const newStats = await buildStatsMap();

  const stats = newStats.map((item, index) => {
    item.main = mainStats[index];
    return item;
  });

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
| full bundle | ${formatBytes(build.main.max)} | ${formatBytes(build.max)} | ${fullIncrease > 0 ? "📈" : "📉"} ${formatBytes(Math.abs(fullIncrease))} |`
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

  console.log(report);

  if (!process.env.DRY_RUN) {
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
} catch(e) {
  console.trace(e);
}
