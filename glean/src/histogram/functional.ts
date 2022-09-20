/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Bucketing } from "./bucketing";
import { saturatingAdd } from "../core/utils.js";
import { Histogram } from "./histogram.js";

export class Functional implements Bucketing {
  exponent: number;

  constructor(logBase: number, bucketsPerMagnitude: number) {
    this.exponent = Math.pow(logBase, 1.0 / bucketsPerMagnitude);
  }

  sampleToBucketMinimum(sample: number): number {
    if (sample === 0) {
      return 0;
    }

    const index = this.sampleToBucketIndex(sample);
    return this.bucketIndexToBucketMinimum(index);
  }

  ranges(): number[] {
    throw new Error("Bucket ranges for functional bucketing are not precomputed");
  }

  /**
   * Maps a sample to a "bucket index" that it belongs in.
   * A "bucket index" is the consecutive integer index of each bucket, useful as a
   * mathematical concept, even though the internal representation is stored and
   * sent using the minimum value in each bucket.
   *
   * @param sample Sample to map to a bucket index
   * @returns The bucket index for the sample
   */
  sampleToBucketIndex(sample: number): number {
    return Math.floor(Math.log(saturatingAdd(sample, 1)) / Math.log(this.exponent));
  }

  /**
   * Determines the minimum value of a bucket, given a bucket index.
   *
   * @param index Index to find the min value for
   * @returns The minimum value of the bucket
   */
  bucketIndexToBucketMinimum(index: number): number {
    return Math.floor(Math.pow(this.exponent, index));
  }

  /**
   * Gets a snapshot of all contiguous values.
   *
   * **Caution** This is a more specific implementation of `snapshotValues` on functional
   * histograms. `snapshotValues` cannot be used with those, due to buckets not being
   * precomputed.
   *
   * @param values All current histogram values
   * @returns Updated values with anything missing replaced with a default value of 0.
   */
  snapshotOverride(values: Record<number, number>): Record<number, number> {
    if (!Object.keys(values).length) {
      return {};
    }

    let minKey: number = Number.MAX_VALUE;
    let maxKey: number = Number.MIN_VALUE;

    Object.keys(values).forEach((key) => {
      const numericKey = Number(key);

      if (minKey === null || numericKey < minKey) {
        minKey = numericKey;
      }

      if (maxKey == null || numericKey > maxKey) {
        maxKey = numericKey;
      }
    });

    const minBucket = this.sampleToBucketIndex(minKey);
    const maxBucket = this.sampleToBucketIndex(maxKey);

    for (let i = minBucket; i < maxBucket; i++) {
      const minBucketIndex = this.bucketIndexToBucketMinimum(i);

      if (!values[minBucketIndex]) {
        values[minBucketIndex] = 0;
      }
    }

    return values;
  }
}

/**
 * We are unable to store the complex `Histogram` object in Glean storage. That means
 * that to persist values, we need to store just the values that are stored in the
 * histogram instead.
 *
 * **NOTE**
 * This function lives in this class rather than `utils` so that we can avoid any
 * circular dependencies.
 *
 * @param values The values to be used to construct the Histogram.
 * @param logBase The base of the logarithm used to determine bucketing.
 * @param bucketsPerMagnitude The buckets per each order of magnitude of the logarithm.
 * @returns A new Histogram containing all the values.
 */
export function constructFunctionalHistogramFromValues(
  values: number[] = [],
  logBase: number,
  bucketsPerMagnitude: number
): Histogram {
  const histogram = new Histogram(new Functional(logBase, bucketsPerMagnitude));

  values.forEach((val) => {
    histogram.accumulate(val);
  });

  return histogram;
}
