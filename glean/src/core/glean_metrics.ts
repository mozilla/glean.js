/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Context } from "./context.js";
import EventMetricType from "./metrics/types/event.js";
import { EVENTS_PING_NAME } from "./constants.js";
import { Lifetime } from "./metrics/lifetime.js";
import log, { LoggingLevel } from "./log.js";

const LOG_TAG = "core.glean_metrics";

interface PageLoadParams {
  url?: string;
  referrer?: string;
  title?: string;
}

interface ClickParams {
  id: string;
}

/**
 * This namespace contains functions to support Glean's auto-instrumentation
 * capability. These functions are either running automatically if enabled
 * via the Glean config or they are called manually by the client.
 */
namespace GleanMetrics {
  // Object to hold all automatic instrumentation metrics.
  const metrics = {
    pageLoad: new EventMetricType(
      {
        category: "glean",
        name: "page_load",
        sendInPings: [EVENTS_PING_NAME],
        lifetime: Lifetime.Ping,
        disabled: false,
      },
      // Page load extras defined in `src/metrics.yaml`.
      ["url", "referrer", "title"]
    ),
    anchorClick: new EventMetricType(
      {
        category: "glean",
        name: "anchor_click",
        sendInPings: [EVENTS_PING_NAME],
        lifetime: Lifetime.Ping,
        disabled: false,
      },
      // extras defined in `src/metrics.yaml`.
      ["id"]
    )
  };

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

    // Each key defaults to the override. If no override is provided, we fall
    // back to the default value IF the `window` or the `document` objects
    // are available.
    //
    // If neither of those are available, then we default to a value that shows
    // that no value is available.
    metrics.pageLoad.record({
      url:
        overrides?.url ?? (typeof window !== "undefined"
          ? window.location.href
          : "URL_NOT_PROVIDED_OR_AVAILABLE"
        ),
      referrer:
        overrides?.referrer ?? (typeof document !== "undefined"
          ? document.referrer
          : "REFERRER_NOT_PROVIDED_OR_AVAILABLE"
        ),
      title:
        overrides?.title ?? (typeof document !== "undefined"
          ? document.title
          : "TITLE_NOT_PROVIDED_OR_AVAILABLE"
        ),
    });
  }

  export function handleClickEvent(event: Event) {
    let element = event.target as Element;
    console.log("element: ", element.tagName);
    if ((event.target as Element)?.tagName.toUpperCase() === "A") {
      let anchorElement = event.target as HTMLAnchorElement;
      console.log("id, href, classList, className, innerHTML: ", anchorElement.id, anchorElement.href, anchorElement.classList, anchorElement.className, anchorElement.innerHTML);
      recordAnchorClick({ id : anchorElement?.id });
    }
  }

  /**
   * If the client has automatic clicks enabled, we will record click events.
   *
   * @param overrides Overrides for each click extra key.
   */
  export function recordAnchorClick(clickParams: ClickParams) {
    // Cannot record an event if Glean has not been initialized.
    if (!Context.initialized) {
      log(
        LOG_TAG,
        "Attempted to record anchor click events before Glean was initialized. This is a no-op.",
        LoggingLevel.Warn
      );
      return;
    }

    // Each key defaults to the override. If no override is provided, we fall
    // back to the default value IF the `window` or the `document` objects
    // are available.
    //
    // If neither of those are available, then we default to a value that shows
    // that no value is available.
    metrics.anchorClick.record({id: clickParams.id});
  }
}

export default GleanMetrics;
