/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Builder, WebDriver } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox";
import path from "path";

/**
 * Setup firefox for testing.
 *
 * @param headless Wether or not to run Firefox on headless mode.
 *        Headless mode should be preferred as it is faster and doesn't open extra windows.
 *        Nevertheless, running the UI may be useful for local testing.
 *
 * @returns The firefox instance thsa was just setup.
 */
export async function setupFirefox(headless: boolean): Promise<WebDriver> {
  const firefoxOptions = new firefox.Options();
  firefoxOptions.setPreference("xpinstall.signatures.required", false);

  // Unset this to run the UI (useful for local testing).
  headless && firefoxOptions.headless();

  // This is the path to Firefox Nightly on Ubuntu with the Mozilla PPA.
  if (process.platform === "linux") {
    firefoxOptions.setBinary("/usr/bin/firefox-trunk");
  } else if (process.platform === "darwin") {
    firefoxOptions.setBinary("/Applications/Firefox Nightly.app/Contents/MacOS/firefox");
  }

  const browser = await new Builder()
    .forBrowser("firefox")
    .setFirefoxOptions(firefoxOptions)
    .build();

  // Load the sample web extension as temporary addon.
  // Any web entension with storage permissions would do here,
  // we only need the web extensions context to run code that relies on the web extensions API.
  try {
    // The selenium-webdriver @types package don't include the `installAddon` function,
    // but I assure you that is does exist, unless it is removed from:
    // https://github.com/SeleniumHQ/selenium/blob/trunk/javascript/node/selenium-webdriver/firefox.js#L632-L652
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    browser.installAddon(
      path.resolve(__dirname, "sample/out.xpi"),
      true
    );
  } catch {
    throw new Error(
      `Error while trying to read the sample Firefox web extensions.
      Make sure you built it before running this test.
      In order to so go into the tests/utils/webext/sample folder and run \`npm run build:xpi\``
    );
  }

  await browser.navigate().to(`file://${path.resolve(__dirname, "test.html")}`);
  return browser;
}

/**
 * Build a proxy for a web extension API.
 *
 * @param browser A Webdriver where we will run this proxied script
 * @param method The method which we want to execute.
 *        This array will work exactly like the StorageIndex.
 */
export function webExtensionAPIProxyBuilder(browser: WebDriver, method: string[]) {
  return async function (...args: never[]): Promise<any> {
    return browser.executeAsyncScript((args: never[], method: string[], callback: any) => {
      console.log(`Executing proxy ${method} with the following args:`, args);

      console.log("Dispatching a new test event!");
      // Send a new test event to be run on the background script of the sample web extension.
      document.dispatchEvent(new CustomEvent("test", {
        detail: {
          fnIndex: method,
          args
        }
      }));

      const handleTestResponse = (event: Event) => {
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
