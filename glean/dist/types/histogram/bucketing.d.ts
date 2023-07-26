/**
 * An interface for bucketing algorithms for histograms.
 *
 * It's responsible to calculate the bucket a sample goes into.
 * It can calculate buckets on-the-fly or pre-calculate buckets and re-use that when needed.
 */
export interface Bucketing {
    sampleToBucketMinimum(sample: number): number;
    ranges(): number[];
    snapshotOverride?: (values: Record<number, number>) => Record<number, number>;
}
