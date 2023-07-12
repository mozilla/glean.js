import type { Histogram } from "../../histogram/histogram";
import type { JSONValue } from "../utils";
export interface DistributionData {
    values: Record<number, number>;
    sum: number;
    count: number;
}
/**
 * Create a snapshot of the histogram with a time unit.
 *
 * Utility function for testing.
 *
 * @param hist Histogram to get the snapshot of.
 * @returns Snapshot of the current histogram.
 */
export declare function snapshot(hist: Histogram): DistributionData;
/**
 * Takes the previous values and casts as a `number[]` or creates a new empty `number[]`. We store
 * previous values as an array so that we can always reconstruct our histogram. We
 * are unable to store complex objects in Glean as they must be JSON parse-able objects.
 *
 * @param jsonValue Will always be either undefined or a `number[]`.
 * @returns An array of previous values or an empty array if nothing was previously stored.
 */
export declare function extractAccumulatedValuesFromJsonValue(jsonValue?: JSONValue): number[];
/**
 * Get a count of all samples with a value less than 0.
 *
 * @param samples Samples for a distribution.
 * @returns Count of samples that had a value less than 0.
 */
export declare function getNumNegativeSamples(samples: number[]): number;
/**
 * Get a count of all samples that exceed the max value.
 *
 * @param samples Samples for a distribution.
 * @param max The max allowed value.
 * @returns Count of samples that exceed the max value.
 */
export declare function getNumTooLongSamples(samples: number[], max: number): number;
