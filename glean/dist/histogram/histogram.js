import { saturatingAdd } from "../core/utils.js";
export var HistogramType;
(function (HistogramType) {
    HistogramType["linear"] = "linear";
    HistogramType["exponential"] = "exponential";
})(HistogramType || (HistogramType = {}));
export class Histogram {
    constructor(bucketing) {
        this.values = {};
        this.count = 0;
        this.sum = 0;
        this.bucketing = bucketing;
    }
    bucketCount() {
        return Object.keys(this.values).length;
    }
    accumulate(sample) {
        const bucketMin = this.bucketing.sampleToBucketMinimum(sample);
        if (!this.values[bucketMin]) {
            this.values[bucketMin] = 0;
        }
        this.values[bucketMin] = this.values[bucketMin] + 1;
        this.sum = saturatingAdd(this.sum, sample);
        this.count += 1;
    }
    isEmpty() {
        return this.count === 0;
    }
    snapshotValues() {
        if (this.bucketing.snapshotOverride) {
            return this.bucketing.snapshotOverride(this.values);
        }
        else {
            return this.getDefaultSnapshot();
        }
    }
    getDefaultSnapshot() {
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
