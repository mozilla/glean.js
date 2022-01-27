/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { By, until } from "selenium-webdriver";

/**
 * Executes a smoke test for @mozilla/glean/web.
 *
 * This assumes a server is running on localhost:8081 with the sample page.
 *
 * @param {*} driver A selenium webdriver.
 */
export async function runWebTest(driver) {
  try {
    // Loading the sample webpage will record a metric and submit a ping.
    // If the ping is submitted succesfully an element in the DOM with the id `msg`
    // will receive the text "Ping submitted succesfully."
    await driver.get("http://localhost:8081");
    // Give it time to send the ping request.
    const successTextContainer = await driver.findElement(By.id("msg"));
    await driver.wait(
      until.elementTextIs(
        successTextContainer,
        "Ping submitted succesfully."
      ), 5000);

    console.log("Test passed.");
  } catch(e) {
    console.log("Test failed.");
    // Bubble error up to calling function.
    throw e;
  }
}
