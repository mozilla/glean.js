/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { PageLoadValues } from "./page_load.js";

import { Context } from "../context.js";
import { recordPageLoadEvent } from "./page_load.js";

/**
 * Wrapper for `recordPageLoadEvent` that checks if page load events
 * are already being automatically recorded, if so we don't want to
 * record them in two different ways.
 *
 * @param values Override values for event keys.
 */
function pageLoad(values: PageLoadValues) {
  if (Context.automaticallyRecordPageLoads) {
    console.log("Page loads are automatically being recorded, this is a no-op.");
    return;
  }

  recordPageLoadEvent(values);
}

export { pageLoad };
