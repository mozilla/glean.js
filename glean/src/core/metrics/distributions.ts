/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Histogram } from "../../histogram/histogram";
import type { JSONValue } from "../utils";

export interface DistributionData {
  // A map containing the bucket index mapped to the accumulated count.
  //
  // This can contain buckets with a count of `0`.
  values: Record<number, number>;

  // The accumulated sum of all the samples in the distribution.
  sum: number;

  // The number of entries in the histogram.
  count: number;
}

/**
 * Create a snapshot of the histogram with a time unit.
 *
 * Utility function for testing.
 *
 * **Caution**
 * This cannot use `Histogram.snapshot_values` and needs to use the more
 * specialized snapshot function.
 *
 * @param hist Histogram to get the snapshot of.
 * @returns Snapshot of the current histogram.
 */
export function snapshot(hist: Histogram): DistributionData {
  const snapshotValues = hist.snapshotValues();

  const utilizedValues: Record<number, number> = {};
  Object.entries(snapshotValues).forEach(([key, value]) => {
    const numericKey = Number(key);
    if (value > 0 && !isNaN(numericKey)) {
      utilizedValues[numericKey] = value;
    }
  });

  return {
    count: hist.count,
    values: utilizedValues,
    sum: hist.sum,
  };
}

/**
 * Takes the previous values and casts as a `number[]` or creates a new empty `number[]`. We store
 * previous durations as an array of values so that we can always reconstruct our histogram. We
 * are unable to store complex objects in Glean as they must be JSON parse-able objects.
 *
 * @param jsonValue Will always be either undefined or a `number[]`.
 * @returns An array of previous durations or an empty array if nothing was previously stored.
 */
export function extractAccumulatedValuesFromJsonValue(jsonValue?: JSONValue): number[] {
  let values: number[];
  if (jsonValue) {
    values = jsonValue as number[];
  } else {
    values = [];
  }

  return values;
}
