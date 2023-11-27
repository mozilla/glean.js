/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Context } from "./context.js";
import EventMetricType from "./metrics/types/event.js";
import { EVENTS_PING_NAME } from "./constants.js";
import { Lifetime } from "./metrics/lifetime.js";
import log, { LoggingLevel } from "./log.js";

const LOG_TAG = "core.glean_metrics";

/// INTERFACES ///
interface PageLoadParams {
  url?: string;
  referrer?: string;
  title?: string;
}

/**
 * This namespace contains functions to support Glean's auto-instrumentation
 * capability. These functions are either running automatically if enabled
 * via the Glean config or they are called manually by the client.
 */
namespace GleanMetrics {
  /**
   * For a standard web project `initialize` is called every time a page
   * loads. For every page load if the client has auto page loads enabled,
   * we will record a page load event.
   *
   * @param overrides Overrides for each page_load extra key.
   */
  export function pageLoad(overrides?: PageLoadParams) {
    // Cannot record an event if Glean has not been initialized.
    if (!Context.initialized) {
      log(
        LOG_TAG,
        "Attempted to record a page load event before Glean was initialized. This is a no-op.",
        LoggingLevel.Warn
      );
      return;
    }

    // Create the pageLoad event metric.
    const pageLoadMetric = new EventMetricType(
      {
        category: "glean",
        name: "page_load",
        sendInPings: [EVENTS_PING_NAME],
        lifetime: Lifetime.Ping,
        disabled: false
      },
      // Page load extras defined in `src/metrics.yaml`.
      ["url", "referrer", "title"]
    );

    // Only record the metric if it is safe to do so on the web.
    if (typeof window !== "undefined" && typeof document !== "undefined") {
      pageLoadMetric.record({
        url: overrides?.url ?? window.location.href,
        referrer: overrides?.referrer ?? document.referrer,
        title: overrides?.title ?? document.title
      });
    }
  }
}

export default GleanMetrics;
