/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import http from "http";
import https from "https";

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

// Copied verbatim from:
// https://www.browserstack.com/docs/automate/selenium/error-codes/keep-alive-not-used
export function fastSelenium() {
  //set the time (in seconds) for connection to be alive
  var keepAliveTimeout = 30*1000;

  if(http.globalAgent && http.globalAgent.hasOwnProperty('keepAlive')) {
      http.globalAgent.keepAlive = true;
      https.globalAgent.keepAlive = true;
      http.globalAgent.keepAliveMsecs = keepAliveTimeout;
      https.globalAgent.keepAliveMsecs = keepAliveTimeout;
  } else {
      var agent = new http.Agent({
          keepAlive: true,
          keepAliveMsecs: keepAliveTimeout
      });

      var secureAgent = new https.Agent({
          keepAlive: true,
          keepAliveMsecs: keepAliveTimeout
      });

      var httpRequest = http.request;
      var httpsRequest = https.request;

      http.request = function(options, callback){
          if(options.protocol == "https:"){
              options["agent"] = secureAgent;
              return httpsRequest(options, callback);
          }
          else {
              options["agent"] = agent;
              return httpRequest(options, callback);
          }
      };
  }
}
