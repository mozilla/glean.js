export function snapshot(hist) {
    const snapshotValues = hist.snapshotValues();
    const utilizedValues = {};
    Object.entries(snapshotValues).forEach(([key, value]) => {
        const numericKey = Number(key);
        if (value > 0 && !isNaN(numericKey)) {
            utilizedValues[numericKey] = value;
        }
    });
    return {
        count: hist.count,
        values: utilizedValues,
        sum: hist.sum
    };
}
export function extractAccumulatedValuesFromJsonValue(jsonValue) {
    let values;
    if (jsonValue) {
        values = jsonValue;
    }
    else {
        values = [];
    }
    return values;
}
export function getNumNegativeSamples(samples) {
    return samples.filter((sample) => sample < 0).length;
}
export function getNumTooLongSamples(samples, max) {
    return samples.filter((sample) => sample > max).length;
}
