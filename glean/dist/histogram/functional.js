import { saturatingAdd } from "../core/utils.js";
import { Histogram } from "./histogram.js";
export class Functional {
    constructor(logBase, bucketsPerMagnitude) {
        this.exponent = Math.pow(logBase, 1.0 / bucketsPerMagnitude);
    }
    sampleToBucketMinimum(sample) {
        if (sample === 0) {
            return 0;
        }
        const index = this.sampleToBucketIndex(sample);
        return this.bucketIndexToBucketMinimum(index);
    }
    ranges() {
        throw new Error("Bucket ranges for functional bucketing are not precomputed");
    }
    sampleToBucketIndex(sample) {
        return Math.floor(Math.log(saturatingAdd(sample, 1)) / Math.log(this.exponent));
    }
    bucketIndexToBucketMinimum(index) {
        return Math.floor(Math.pow(this.exponent, index));
    }
    snapshotOverride(values) {
        if (!Object.keys(values).length) {
            return {};
        }
        let minKey = Number.MAX_VALUE;
        let maxKey = Number.MIN_VALUE;
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
export function constructFunctionalHistogramFromValues(values = [], logBase, bucketsPerMagnitude) {
    const histogram = new Histogram(new Functional(logBase, bucketsPerMagnitude));
    values.forEach((val) => {
        histogram.accumulate(val);
    });
    return histogram;
}
