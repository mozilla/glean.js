/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Bucketing } from "./bucketing";
import { binarySearch } from "./utils.js";

/**
 * Create the possible ranges in a linear distribution from `min` to `max` with
 * `bucket_count` buckets.
 *
 * This algorithm calculates `bucket_count` number of buckets of equal sizes between `min` and `max`.
 *
 * Bucket limits are the minimal bucket value.
 * That means values in a bucket `i` are `bucket[i] <= value < bucket[i+1]`.
 * It will always contain an underflow bucket (`< 1`).
 *
 * @param min Minimum number in the distribution
 * @param max Maximum number in the distribution
 * @param count Number of total buckets
 * @returns Computed bucket ranges
 */
function linearRange(min: number, max: number, count: number): number[] {
  const ranges = [];
  ranges.push(0);

  const newMin = Math.max(1, min);

  for (let i = 1; i < count; i++) {
    const range = (newMin * (count - 1 - i) + max * (i - 1)) / (count - 2);
    ranges.push(range);
  }

  return ranges;
}

export class PrecomputedLinear implements Bucketing {
  bucketRanges: number[];
  min: number;
  max: number;
  bucketCount: number;

  constructor(min: number, max: number, bucketCount: number) {
    this.min = min;
    this.max = max;
    this.bucketCount = bucketCount;
    this.bucketRanges = [];
  }

  /**
   * Get the bucket for the sample.
   *
   * This uses a binary search to locate the index `i` of the bucket such that:
   * bucket[i] <= sample < bucket[i+1].
   *
   * @param sample Value that we will find a bucket for
   * @returns The bucket that the sample will be placed in
   */
  sampleToBucketMinimum(sample: number): number {
    const limit = binarySearch(this.ranges(), sample);

    if (limit === -1) {
      throw new Error("Unable to find correct bucket for the sample.");
    }

    return this.ranges()[limit];
  }

  ranges(): number[] {
    return this.bucketRanges || linearRange(this.min, this.max, this.bucketCount);
  }
}
