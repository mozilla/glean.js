import type { Bucketing } from "./bucketing";
import { Histogram } from "./histogram.js";
export declare class Functional implements Bucketing {
    exponent: number;
    constructor(logBase: number, bucketsPerMagnitude: number);
    sampleToBucketMinimum(sample: number): number;
    ranges(): number[];
    /**
     * Maps a sample to a "bucket index" that it belongs in.
     *
     * A "bucket index" is the consecutive integer index of each bucket, useful as a
     * mathematical concept, even though the internal representation is stored and
     * sent using the minimum value in each bucket.
     *
     * @param sample The sample to map to a bucket index.
     * @returns The bucket index for the sample.
     */
    sampleToBucketIndex(sample: number): number;
    /**
     * Determines the minimum value of a bucket, given a bucket index.
     *
     * @param index The index to find the min value for.
     * @returns The minimum value of the bucket.
     */
    bucketIndexToBucketMinimum(index: number): number;
    /**
     * Gets a snapshot of all contiguous values.
     *
     * **Caution** This is a more specific implementation of `snapshotValues` on functional
     * histograms. `snapshotValues` cannot be used with those, due to buckets not being
     * precomputed.
     *
     * @param values All the current histogram values.
     * @returns Updated values with anything missing replaced with a default value of 0.
     */
    snapshotOverride(values: Record<number, number>): Record<number, number>;
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
export declare function constructFunctionalHistogramFromValues(values: number[] | undefined, logBase: number, bucketsPerMagnitude: number): Histogram;
