/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import webdriver from "selenium-webdriver"
import { Capabilities } from "selenium-webdriver";

import { App, runWebTest } from "./utils.js"

const app = new App();
await app.start();

await (async function() {
  let driver;
  try {
    driver = new webdriver.Builder()
      .forBrowser("firefox")
      .withCapabilities(Capabilities.firefox())
      .build();

    await runWebTest(driver);
  } catch(e) {
    // Make sure the process exits with an error code
    process.exitCode = 1;
  }

  driver.quit();
}());

await app.stop();
