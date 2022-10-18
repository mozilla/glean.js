/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * An interface for bucketing algorithms for histograms.
 *
 * It's responsible to calculate the bucket a sample goes into.
 * It can calculate buckets on-the-fly or pre-calculate buckets and re-use that when needed.
 */
export interface Bucketing {
  // Get the bucket's minimum value the sample falls into.
  sampleToBucketMinimum(sample: number): number;

  // The computed bucket ranges for this bucketing algorithm.
  ranges(): number[];

  // Ability to override the `snapshot` function in `Histogram`.
  snapshotOverride?: (values: Record<number, number>) => Record<number, number>;
}
