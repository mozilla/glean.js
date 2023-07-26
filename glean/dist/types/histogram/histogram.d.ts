import type { Bucketing } from "./bucketing.js";
export declare enum HistogramType {
    linear = "linear",
    exponential = "exponential"
}
/**
 * A histogram.
 *
 * Stores the counts per bucket and tracks the count of added samples and the total sum.
 * The bucketing algorithm can be changed.
 */
export declare class Histogram {
    values: Record<number, number>;
    count: number;
    sum: number;
    bucketing: Bucketing;
    constructor(bucketing: Bucketing);
    /**
     * Gets the number of buckets in the Histogram.
     *
     * @returns The number of buckets in the histogram.
     */
    bucketCount(): number;
    /**
     * Adds a single value to the histogram.
     *
     * @param sample The value to add to the histogram.
     */
    accumulate(sample: number): void;
    /**
     * Checks if this histogram recorded any values.
     *
     * @returns Whether the histogram has any values.
     */
    isEmpty(): boolean;
    /**
     * Gets a snapshot of all values from the first bucket until one past the last filled bucket,
     * filling in empty buckets with 0.
     *
     * If a `snapshotOverride` function has been provided, we will provide a snapshot using that
     * function rather than the default snapshot. This helps handle scenarios like Functional histograms
     * where buckets aren't precomputed, so you cannot get `ranges`.
     *
     * @returns A snapshot of the stored values.
     */
    snapshotValues(): Record<number, number>;
    private getDefaultSnapshot;
}
