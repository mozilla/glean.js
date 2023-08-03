/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { DatetimeMetric } from "../../metrics/types/datetime.js";
import type { InternalDatetimeMetricType as DatetimeMetricType } from "../../metrics/types/datetime.js";
import type CommonPingData from "../common_ping_data.js";

import { Context } from "../../context.js";
import { GLEAN_SCHEMA_VERSION } from "../../constants.js";

export const PINGS_MAKER_LOG_TAG = "core.Pings.Maker";

/// INTERFACES ///
export interface StartTimeMetricData {
  startTimeMetric: DatetimeMetricType;
  startTime: DatetimeMetric;
}

/// HELPERS ///
/**
 * Build a pings submission path.
 *
 * @param identifier The pings UUID identifier.
 * @param ping  The ping to build a path for.
 * @returns The final submission path.
 */
export function makePath(identifier: string, ping: CommonPingData): string {
  // We are sure that the applicationId is not `undefined` at this point,
  // this function is only called when submitting a ping
  // and that function return early when Glean is not initialized.
  return `/submit/${Context.applicationId}/${ping.name}/${GLEAN_SCHEMA_VERSION}/${identifier}`;
}

/**
 * Gathers all the headers to be included to the final ping request.
 *
 * This guarantees that if headers are disabled after the ping collection,
 * ping submission will still contain the desired headers.
 *
 * The current headers gathered here are:
 * - [X-Debug-ID]
 * - [X-Source-Tags]
 *
 * @returns An object containing all the headers and their values
 *          or `undefined` in case no custom headers were set.
 */
export function getPingHeaders(): Record<string, string> | undefined {
  const headers: Record<string, string> = {};

  if (Context.config.debugViewTag) {
    headers["X-Debug-ID"] = Context.config.debugViewTag;
  }

  if (Context.config.sourceTags) {
    headers["X-Source-Tags"] = Context.config.sourceTags.toString();
  }

  if (Object.keys(headers).length > 0) {
    return headers;
  }
}
