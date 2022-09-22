/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { Bucketing } from "./bucketing.js";
import { saturatingAdd } from "../core/utils.js";

export enum HistogramType {
  // A histogram with linear distributed buckets.
  linear = "linear",
  // A histogram with exponential distributed buckets.
  exponential = "exponential",
}

/**
 * A histogram.
 *
 * Stores the counts per bucket and tracks the count of added samples and the total sum.
 * The bucketing algorithm can be changed.
 */
export class Histogram {
  // Mapping bucket's minimum to sample count.
  values: Record<number, number>;

  // The count of samples added.
  count: number;

  // The total sum of samples.
  sum: number;

  // The bucketing algorithm used.
  bucketing: Bucketing;

  constructor(bucketing: Bucketing) {
    this.values = {};
    this.count = 0;
    this.sum = 0;
    this.bucketing = bucketing;
  }

  /**
   * Gets the number of buckets in the Histogram.
   *
   * @returns `this.count`
   */
  bucketCount(): number {
    return Object.keys(this.values).length;
  }

  /**
   * Adds a single value to the histogram.
   *
   * @param sample Value to add to the histogram
   */
  accumulate(sample: number) {
    const bucketMin = this.bucketing.sampleToBucketMinimum(sample);

    // Fill in missing entires with 0s
    if (!this.values[bucketMin]) {
      this.values[bucketMin] = 0;
    }

    this.values[bucketMin] = this.values[bucketMin] + 1;

    this.sum = saturatingAdd(this.sum, sample);
    this.count += 1;
  }

  /**
   * Checks if this histogram recorded any values.
   *
   * @returns Whether the histogram has any values
   */
  isEmpty(): boolean {
    return this.count === 0;
  }

  /**
   * Gets a snapshot of all values from the first bucket until one past the last filled bucket,
   * filling in empty buckets with 0.
   *
   * If a `snapshotOverride` function has been provided, we will provide a snapshot using that
   * function rather than the default snapshot. This helps handle scenarios like Functional histograms
   * where buckets aren't precomputed, so you cannot get `ranges`.
   *
   * @returns Snapshot of the stored values
   */
  snapshotValues(): Record<number, number> {
    if (this.bucketing.snapshotOverride) {
      return this.bucketing.snapshotOverride(this.values);
    } else {
      return this.getDefaultSnapshot();
    }
  }

  private getDefaultSnapshot(): Record<number, number> {
    const valuesClone = { ...this.values };

    const maxBucket = Object.keys(valuesClone).reduce((prev, curr) => {
      const prevAsNum = Number(prev);
      const currAsNum = Number(curr);
      return currAsNum > prevAsNum ? curr : prev;
    });

    const ranges = this.bucketing.ranges();
    for (const minBucket of ranges) {
      if (!valuesClone[minBucket]) {
        valuesClone[minBucket] = 0;
      }

      if (minBucket > Number(maxBucket)) {
        break;
      }
    }

    return valuesClone;
  }
}
