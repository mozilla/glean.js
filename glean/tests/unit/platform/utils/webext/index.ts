/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { WebDriver } from "selenium-webdriver";
import { Builder, Capabilities } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox";

import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const firefoxDriver = await (async function getFirefoxDriver(): Promise<WebDriver> {
  const firefoxOptions = new firefox.Options()
    .setPreference("xpinstall.signatures.required", false)
    // Unset this to run the UI (useful for local testing).
    .headless();

  if (process.platform === "linux") {
    // Look for the Firefox executable in different locations.
    const FIREFOX_PATHS = [
      "/usr/bin/firefox-trunk",
      "/usr/bin/firefox",
    ];

    for (const path of FIREFOX_PATHS) {
      if (fs.existsSync(path)) {
        firefoxOptions.setBinary(path);
        break;
      }
    }
  } else if (process.platform === "darwin") {
    firefoxOptions.setBinary(
      "/Applications/Firefox Nightly.app/Contents/MacOS/firefox"
    );
  } else {
    throw new Error(`Unable to run Glean.js web extension tests! Platform not supported: ${process.platform}`);
  }

  return await new Builder()
    .setFirefoxOptions(firefoxOptions)
    .withCapabilities(Capabilities.firefox())
    .forBrowser("firefox")
    .build();
})();

/**
 * Setup firefox for testing.
 *
 * @returns The firefox instance thsa was just setup.
 */
export async function setupFirefox(): Promise<WebDriver> {
  // Load the sample web extension as temporary addon.
  // Any web extension with storage permissions would do here,
  // we only need the web extensions context to run code that relies on the web extensions API.
  try {
    // The selenium-webdriver @types package don't include the `installAddon` function,
    // but I assure you that is does exist, unless it is removed from:
    // https://github.com/SeleniumHQ/selenium/blob/trunk/javascript/node/selenium-webdriver/firefox.js#L632-L652
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await firefoxDriver.installAddon(
      path.resolve(__dirname, "sample/web-ext-artifacts/gleanjs-test-addon-0.0.1.zip"),
      true
    );
  } catch {
    throw new Error(
      `Error while trying to read the sample Firefox web extension.
      Make sure you built it before running this test.
      In order to so go into the tests/platform/utils/webext/sample folder and run \`npm run build:xpi\``
    );
  }

  await firefoxDriver.navigate().to(`file://${path.resolve(__dirname, "test.html")}`);
  return firefoxDriver;
}

/**
 * Build a proxy for a web extension API.
 *
 * @param browser A Webdriver where we will run this proxied script
 * @param method The method which we want to execute.
 *        This array will work exactly like the StorageIndex.
 * @returns A proxy function for the given browser method.
 */
export function webExtensionAPIProxyBuilder(browser: WebDriver, method: string[]) {
  return async function (...args: never[]): Promise<never> {
    return browser.executeAsyncScript((args: never[], method: string[], callback: (arg: string) => void) => {
      console.log(`Executing proxy ${JSON.stringify(method)} with the following args:`, args);

      console.log("Dispatching a new test event!");
      // Send a new test event to be run on the background script of the sample web extension.
      document.dispatchEvent(new CustomEvent("test", {
        detail: {
          fnIndex: method,
          args
        }
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleTestResponse: any = (event: CustomEvent) => {
        console.log("Caught a new test response", event.detail);
        document.removeEventListener("testResponse", handleTestResponse, false);
        // This callback will resolve the execution of the current script.
        console.log(JSON.stringify(JSON.parse(event.detail), null, 2));
        callback(JSON.parse(event.detail));
      };

      // When the web extension is done processing the above sent event,
      // it will send a `testResponse` event, which we catch here.
      document.addEventListener("testResponse", handleTestResponse, false);
    }, args, method);
  };
}
