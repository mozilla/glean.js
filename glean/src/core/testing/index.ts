/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ConfigurationInterface } from "../config";
import { testInitializeGlean, testUninitializeGlean } from "./utils.js";

/**
 * Test-only API**
 *
 * Resets the Glean singleton to its initial state and re-initializes it.
 *
 * Note: There is no way to only allow this function to be called in test mode,
 * because this is the function that puts Glean in test mode by setting Context.testing to true.
 *
 * @param applicationId The application ID (will be sanitized during initialization).
 * @param uploadEnabled Determines whether telemetry is enabled.
 *        If disabled, all persisted metrics, events and queued pings (except
 *        first_run_date) are cleared. Default to `true`.
 * @param config Glean configuration options.
 * @param clearStores Whether or not to clear the events, metrics and pings databases on reset.
 */
export async function testResetGlean(
  applicationId: string,
  uploadEnabled = true,
  config?: ConfigurationInterface,
  clearStores = true,
): Promise<void> {
  await testUninitializeGlean(clearStores);
  await testInitializeGlean(applicationId, uploadEnabled, config);
}
