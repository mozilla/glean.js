/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { MetricType } from "..";
import type MetricsDatabase from "../database";

const MAX_LABELS = 16;
const MAX_LABEL_LENGTH = 61;
export const OTHER_LABEL = "__other__";

// ** IMPORTANT **
// When changing this documentation or the regex, be sure to change the same code
// in the Glean SDK repository as well.
//
// This regex is used for matching against labels and should allow for dots,
// underscores, and/or hyphens. Labels are also limited to starting with either
// a letter or an underscore character.
//
// Some examples of good and bad labels:
//
// Good:
// * `this.is.fine`
// * `this_is_fine_too`
// * `this.is_still_fine`
// * `thisisfine`
// * `_.is_fine`
// * `this.is-fine`
// * `this-is-fine`
// Bad:
// * `this.is.not_fine_due_tu_the_length_being_too_long_i_thing.i.guess`
// * `1.not_fine`
// * `this.$isnotfine`
// * `-.not_fine`
const LABEL_REGEX = /^[a-z_][a-z0-9_-]{0,29}(\.[a-z_][a-z0-9_-]{0,29})*$/;

/**
 * Combines a metric's base identifier and label.
 *
 * @param metricName the metric base identifier
 * @param label the label
 *
 * @returns a string representing the complete metric id including the label.
 */
export function combineIdentifierAndLabel(
  metricName: string,
  label: string
): string {
  return `${metricName}/${label}`;
}

/**
 * Checks if the dynamic label stored in the metric data is
 * valid. If not, record an error and store data in the "__other__"
 * label.
 *
 * @param metricsDatabase the metrics database.
 * @param metric the metric metadata.
 *
 * @returns a valid label that can be used to store data.
 */
export async function getValidDynamicLabel(metricsDatabase: MetricsDatabase, metric: MetricType): Promise<string> {
  // Note that we assume `metric.dynamicLabel` to always be available within this function.
  // This is a safe assumptions because we should only call `getValidDynamicLabel` if we have
  // a dynamic label.
  if (metric.dynamicLabel === undefined) {
    throw new Error("This point should never be reached.");
  }

  const key = combineIdentifierAndLabel(metric.baseIdentifier(), metric.dynamicLabel);

  for (const ping of metric.sendInPings) {
    if (await metricsDatabase.hasMetric(metric.lifetime, ping, metric.type, key)) {
      return key;
    }
  }

  let numUsedKeys = 0;
  for (const ping of metric.sendInPings) {
    numUsedKeys += await metricsDatabase.countByBaseIdentifier(
      metric.lifetime,
      ping,
      metric.type,
      metric.baseIdentifier());
  }

  let hitError = false;
  if (numUsedKeys >= MAX_LABELS) {
    hitError = true;
  } else if (metric.dynamicLabel.length > MAX_LABEL_LENGTH) {
    console.error(`label length ${metric.dynamicLabel.length} exceeds maximum of ${MAX_LABEL_LENGTH}`);
    hitError = true;
    // TODO: record error in bug 1682574
  } else if (!LABEL_REGEX.test(metric.dynamicLabel)) {
    console.error(`label must be snake_case, got '${metric.dynamicLabel}'`);
    hitError = true;
    // TODO: record error in bug 1682574
  }

  return (hitError)
    ? combineIdentifierAndLabel(metric.baseIdentifier(), OTHER_LABEL)
    : key;
}
 