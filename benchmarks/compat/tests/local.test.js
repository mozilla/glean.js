/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import webdriver from "selenium-webdriver"
import { Capabilities } from "selenium-webdriver";

import { runWebTest } from "./utils.js"

await (async function() {
  let driver;
  try {
    driver = new webdriver.Builder()
      .forBrowser("firefox")
      .withCapabilities(Capabilities.firefox())
      .build();

    await runWebTest(driver);
  } catch(e) {
    // We just catch this so that even if the test fails we quit the driver.
    // Either way there will be a log saying if the test failed.
  }

  driver.quit();
}());
