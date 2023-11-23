/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { InternalEventMetricType as EventMetricType } from "./types/event.js";
import { Lifetime } from "./lifetime.js";
import { EVENTS_PING_NAME } from "../constants.js";

/**
 * Creates a `glean.page_load` event metric.
 *
 * @returns A metric type instance.
 */
function getGleanPageLoadEventMetric(): EventMetricType {
  return new EventMetricType(
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
}

/**
 * For a standard web project `initialize` is called every time a page
 * loads. For every page load if the client has auto page loads enabled,
 * we will record a page load event.
 */
export function recordPageLoadEvent(): void {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const eventMetric = getGleanPageLoadEventMetric();
    eventMetric.record({
      url: window.location.href,
      referrer: document.referrer,
      title: document.title
    });
  }
}
