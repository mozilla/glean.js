/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import path, { dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import https from "https";

import { By, until } from "selenium-webdriver";
import webpack from "webpack";
import DevServer from "webpack-dev-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = 3000;

export class App {
  constructor() {
    this.compiler = webpack({
      mode: "development",
      entry: path.join(__dirname, "../index.js"),
      output: {
        path: path.join(__dirname, "../dist"),
        filename: "index.js",
      }
    });

    this.server = new DevServer({
      allowedHosts: 'all',
      static: {
        directory: path.join(__dirname, "../"),
      },
      port: 3000,
    }, this.compiler);
  }

  async build() {
    await new Promise((resolve, reject) => {
      this.compiler.run(err => {
        if (err) reject(err);
        resolve();

        this.compiler.close(closeErr => reject(closeErr));
      });
    });
  }

  async start() {
    await this.build();
    console.log("Starting server...");
    await this.server.start();
  }

  async stop() {
    console.log("Stopping server...");
    await this.server.stop();
  }
}

/**
 * Executes a smoke test for @mozilla/glean/web.
 *
 * This assumes the app is being executed in port ${PORT}.
 *
 * @param {*} driver A selenium webdriver.
 */
export async function runWebTest(driver) {
  try {
    // Loading the sample webpage will record a metric and submit a ping.
    // If the ping is submitted successfully an element in the DOM with the id `msg`
    // will receive the text "Ping submitted successfully."
    await driver.get(`http://localhost:${PORT}/`);
    // Give it time to send the ping request.
    const successTextContainer = await driver.findElement(By.id("msg"));
    await driver.wait(
      until.elementTextIs(
        successTextContainer,
        "Ping submitted successfully."
      ), 11_000); // 1s more than the default upload timeout in Glean.

    console.log("Test passed.");
  } catch(e) {
    console.log("Test failed.", e);
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
