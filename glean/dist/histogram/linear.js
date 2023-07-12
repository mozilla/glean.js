import { Histogram } from "./histogram.js";
import { binarySearch } from "./utils.js";
export function linearRange(min, max, count) {
    const ranges = [];
    ranges.push(0);
    const newMin = Math.max(1, min);
    for (let i = 1; i < count; i++) {
        const range = (newMin * (count - 1 - i) + max * (i - 1)) / (count - 2);
        ranges.push(Math.floor(range));
    }
    return ranges;
}
export class PrecomputedLinear {
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
        this.bucketRanges = linearRange(this.min, this.max, this.bucketCount);
        return this.bucketRanges;
    }
}
export function constructLinearHistogramFromValues(values = [], rangeMin, rangeMax, bucketCount) {
    const histogram = new Histogram(new PrecomputedLinear(rangeMin, rangeMax, bucketCount));
    values.forEach((val) => {
        histogram.accumulate(val);
    });
    return histogram;
}
