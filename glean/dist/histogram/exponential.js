import { Histogram } from "./histogram.js";
import { binarySearch } from "./utils.js";
export function exponentialRange(min, max, bucketCount) {
    const logMax = Math.log(max);
    const ranges = [];
    let current = min;
    if (current === 0) {
        current = 1;
    }
    ranges.push(0);
    ranges.push(current);
    for (let i = 2; i < bucketCount; i++) {
        const logCurrent = Math.log(current);
        const logRatio = (logMax - logCurrent) / (bucketCount - i);
        const logNext = logCurrent + logRatio;
        const nextValue = Math.round(Math.exp(logNext));
        if (nextValue > current) {
            current = nextValue;
        }
        else {
            current += 1;
        }
        ranges.push(current);
    }
    return ranges;
}
export class PrecomputedExponential {
    constructor(min, max, bucketCount) {
        this.min = min;
        this.max = max;
        this.bucketCount = bucketCount;
        this.bucketRanges = [];
    }
    sampleToBucketMinimum(sample) {
        const limit = binarySearch(this.ranges(), sample);
        if (limit === -1) {
            throw new Error("Unable to find correct bucket for the sample.");
        }
        return this.ranges()[limit];
    }
    ranges() {
        if (this.bucketRanges.length) {
            return this.bucketRanges;
        }
        this.bucketRanges = exponentialRange(this.min, this.max, this.bucketCount);
        return this.bucketRanges;
    }
}
export function constructExponentialHistogramFromValues(values = [], rangeMin, rangeMax, bucketCount) {
    const histogram = new Histogram(new PrecomputedExponential(rangeMin, rangeMax, bucketCount));
    values.forEach((val) => {
        histogram.accumulate(val);
    });
    return histogram;
}
