/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import browserstack from "browserstack-local";
import webdriver from "selenium-webdriver";

import { runWebTest, fastSelenium, App } from "./utils.js"

fastSelenium();

const app = new App();
app.start();

// All of the minimum supported versions were found through manual testing.
const BROWSERS = [
  { name: "firefox", minVersion: "60" },
  { name: "safari", minVersion: "11.1" },
  { name: "chrome", minVersion: "66" },
  // Oldest version of edge available in BrowserStack.
  // We are not sure it does not work in even older versions.
  { name: "edge", minVersion: "80" },
];

// Start BrowserStack.Local so that the remote machines can access localhost.
const bs = new browserstack.Local();
await new Promise(resolve => {
  bs.start(
    {
      "key": process.env.BROWSERSTACK_ACCESS_KEY,
    },
    () => {
      console.log("Started BrowserStack.");
      resolve();
    }
  );
});

// Run the test for both the latest version
// and the minimum supported version of each browser.
for (const browser of BROWSERS) {
  for (const version of [browser.minVersion, "latest"]) {
    console.info(`Smoke testing @mozilla/glean/web in ${browser.name} (${version}).`);
    await (async function () {
      let driver;
      try {
        const capabilities = {
          "browserName": browser.name,
          "browser_version": version,
          "name": "Browser compatibility smoke test",
          "build": process.env.CIRCLE_JOB || "Local BrowserStack testing",
          "browserstack.networkLogs": "true",
          "browserstack.debug": "true",
          "browserstack.console": "verbose",
          "browserstack.local": "true",
        }

        driver = new webdriver.Builder()
          .usingServer(`https://${process.env.BROWSERSTACK_USER_NAME}:${process.env.BROWSERSTACK_ACCESS_KEY}@hub-cloud.browserstack.com/wd/hub`)
          .withCapabilities({
            ...capabilities,
            // Add W3C protocol version
            'w3c': true,
            // Add JSON Wire Protocol capabilities
            'desiredCapabilities': capabilities
          })
          .build();

        await runWebTest(driver);

        // Marking the test as passed for Browserstack
        await driver.executeScript(
          "browserstack_executor: {\"action\": \"setSessionStatus\", \"arguments\": {\"status\":\"passed\",\"reason\": \"Ping successfully sent!\"}}"
        );
      } catch (_) {
        // Make sure the process exits with an error code
        process.exitCode = 1;
        // Marking the test as failed for Browserstack
        await driver.executeScript(
          "browserstack_executor: {\"action\": \"setSessionStatus\", \"arguments\": {\"status\":\"failed\",\"reason\": \"Ping not sent :(\"}}"
        );
      }

      // Quit the browser
      await driver.quit();
    }());
  }
}

app.stop();

// Stop BrowserStack.Local.
await new Promise(resolve => {
  bs.stop(
    () => {
      console.log("Stopped BrowserStack.");
      resolve();
    }
  );
});

