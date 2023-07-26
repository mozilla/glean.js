import type { Bucketing } from "./bucketing.js";
import { Histogram } from "./histogram.js";
/**
 * Create the possible ranges in an exponential distribution from `min` to `max` with
 * `bucket_count` buckets.
 *
 * This algorithm calculates the bucket sizes using a natural log approach to get `bucket_count` number of buckets,
 * exponentially spaced between `min` and `max`.
 *
 * Bucket limits are the minimal bucket value.
 * That means values in a bucket `i` are `bucket[i] <= value < bucket[i+1]`.
 * It will always contain an underflow bucket (`< 1`).
 *
 * **NOTE**
 * Exported solely for testing purposes.
 *
 * @param min The minimum number in the distribution.
 * @param max The maximum number in the distribution.
 * @param bucketCount The number of total buckets.
 * @returns The computed bucket ranges.
 */
export declare function exponentialRange(min: number, max: number, bucketCount: number): number[];
export declare class PrecomputedExponential implements Bucketing {
    bucketRanges: number[];
    min: number;
    max: number;
    bucketCount: number;
    constructor(min: number, max: number, bucketCount: number);
    /**
     * Get the bucket for the sample.
     *
     * This uses a binary search to locate the index `i` of the bucket such that:
     * bucket[i] <= sample < bucket[i+1].
     *
     * @param sample The value that we will find a bucket for.
     * @returns The bucket that the sample will be placed in.
     */
    sampleToBucketMinimum(sample: number): number;
    ranges(): number[];
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
 * @param rangeMin The minimum number in the distribution.
 * @param rangeMax The maximum number in the distribution.
 * @param bucketCount The number of total buckets.
 * @returns An exponential histogram containing all accumulated values.
 */
export declare function constructExponentialHistogramFromValues(values: number[] | undefined, rangeMin: number, rangeMax: number, bucketCount: number): Histogram;
