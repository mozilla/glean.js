/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import TestPlatform from "../../platform/test/index.js";
import type { ConfigurationInterface } from "../config.js";
import { Context } from "../context.js";
import { testResetEvents } from "../events/utils.js";
import Glean from "../glean.js";
import { CoreMetrics } from "../internal_metrics.js";

/**
 * Test-only API
 *
 * Initializes Glean in testing mode.
 *
 * All platform specific APIs will be mocked.
 *
 * @param applicationId The application ID (will be sanitized during initialization).
 * @param uploadEnabled Determines whether telemetry is enabled.
 *        If disabled, all persisted metrics, events and queued pings (except
 *        first_run_date) are cleared. Default to `true`.
 * @param config Glean configuration options.
 */
export async function testInitializeGlean(
  applicationId: string,
  uploadEnabled = true,
  config?: ConfigurationInterface
): Promise<void> {
  // Core metrics need to be re-initialized so that
  // the supportedMetrics map is re-created.
  Glean.coreMetrics = new CoreMetrics();

  Context.testing = true;

  Glean.setPlatform(TestPlatform);
  Glean.initialize(applicationId, uploadEnabled, config);

  await Context.dispatcher.testBlockOnQueue();
}

/**
 * Test-only API
 *
 * Resets Glean to an uninitialized state.
 * This is a no-op in case Glean has not been initialized.
 *
 * @param clearStores Whether or not to clear the events, metrics and pings databases on uninitialize.
 */
export async function testUninitializeGlean(clearStores = true): Promise<void> {
  if (Context.initialized) {
    await Glean.shutdown();

    if (clearStores) {
      await Context.eventsDatabase.clearAll();
      await Context.metricsDatabase.clearAll();
      await Context.pingsDatabase.clearAll();
    }

    // Get back to an uninitialized state.
    Context.testUninitialize();

    // Deregister all plugins
    testResetEvents();
  }
}
