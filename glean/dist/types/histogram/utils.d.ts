/**
 * Classic implementation of a binary search with a small tweak since we are
 * using this for our bucketing algorithms.
 *
 * Rather than return `-1` if the exact value is not found, we return whichever
 * value our final `mid` is closest too. This ensures that we put our target
 * into the correct bucket.
 *
 * @param arr The array of numbers to search.
 * @param target The number that we are looking for.
 * @returns The index of the bucket our target should be placed in.
 */
export declare function binarySearch(arr: number[], target: number): number;
