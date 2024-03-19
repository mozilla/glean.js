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

type ElementClickEventContext = {
  id?: string;
  type?: string;
  label?: string;
};

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
    elementClick: new EventMetricType(
      {
        category: "glean",
        name: "element_click",
        sendInPings: [EVENTS_PING_NAME],
        lifetime: Lifetime.Ping,
        disabled: false,
      },
      // extras defined in `src/metrics.yaml`.
      ["id", "type", "label"]
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

  /**
   * Construct click event context for a given element.
   *
   * The element should have at least one of the data-glean-{x} attributes where x corresponds
   * to the keys of ElementClickEventContext).
   *
   * @param element Element object.
   * @returns ElementClickEventContext
   */
  function constructClickEventContextForElement(element: Element) {
    const dataset = (element as HTMLElement).dataset;
    const elementClickEventContext: ElementClickEventContext = {
      ...(dataset.gleanId && { id: dataset.gleanId }),
      ...(dataset.gleanType && { type: dataset.gleanType }),
      ...(dataset.gleanLabel && { label: dataset.gleanLabel })
    };
    return elementClickEventContext;
  }

  /**
   * Handler for "click" events on a document.
   *
   * It records click event on an html element if the element has any of the data-glean-* attributes.
   * Otherwise, the event is ignored.
   *
   * @param event Event object.
   */
  export function handleClickEvent(event: Event) {
    const clickedElement = event.target as Element;

    const closestElementWithClickAttributes: Element | null = clickedElement.closest("[data-glean-id], [data-glean-type], [data-glean-label]");
    if (!closestElementWithClickAttributes) {
      console.log("Couldn't find closest element with click attributes for click event target:", clickedElement);
      return;
    }

    const elementClickEventContext: ElementClickEventContext = constructClickEventContextForElement(closestElementWithClickAttributes);
    recordElementClick(elementClickEventContext);
  }

  /**
   * Record click on an html element.
   *
   * @param elementClickEventContext element click event extra keys.
   */
  export function recordElementClick(elementClickEventContext: ElementClickEventContext) {
    // Cannot record an event if Glean has not been initialized.
    if (!Context.initialized) {
      log(
        LOG_TAG,
        "Attempted to record element click event before Glean was initialized. This is a no-op.",
        LoggingLevel.Warn
      );
      return;
    }

    metrics.elementClick.record(elementClickEventContext);
  }
}

export default GleanMetrics;
