/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import { Histogram } from "../../../../src/histogram/histogram";
import { exponentialRange, PrecomputedExponential } from "../../../../src/histogram/exponential";

const DEFAULT_BUCKET_COUNT = 100;
const DEFAULT_RANGE_MIN = 0;
const DEFAULT_RANGE_MAX = 60000;

describe("Exponential Histograms", function () {
  it("can count", function () {
    const hist = new Histogram(new PrecomputedExponential(1, 500, 10));
    assert.ok(hist.isEmpty());

    for (let i = 1; i <= 10; i++) {
      hist.accumulate(i);
    }

    assert.equal(10, hist.count);
    assert.equal(55, hist.sum);
  });

  it("overflow values accumulate in the last bucket", function () {
    const hist = new Histogram(
      new PrecomputedExponential(DEFAULT_RANGE_MIN, DEFAULT_RANGE_MAX, DEFAULT_BUCKET_COUNT)
    );

    hist.accumulate(DEFAULT_RANGE_MAX + 100);
    assert.equal(1, hist.values[DEFAULT_RANGE_MAX]);
  });

  it("short exponential buckets are correct", function () {
    const testBuckets = [0, 1, 2, 3, 5, 9, 16, 29, 54, 100];

    assert.deepEqual(testBuckets, exponentialRange(1, 100, 10));
    // There's always a zero bucket, so we can increase the lower limit.
    assert.deepEqual(testBuckets, exponentialRange(0, 100, 10));
  });

  it("default exponential buckets are correct", function () {
    // Hand calculated values using current default range 0 - 60000 and bucket count of 100.
    // NOTE: The final bucket, regardless of width, represents the overflow bucket to hold any
    // values beyond the maximum (in this case the maximum is 60000)
    const testBuckets = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 19, 21, 23, 25, 28, 31, 34, 38, 42,
      46, 51, 56, 62, 68, 75, 83, 92, 101, 111, 122, 135, 149, 164, 181, 200, 221, 244, 269, 297,
      328, 362, 399, 440, 485, 535, 590, 651, 718, 792, 874, 964, 1064, 1174, 1295, 1429, 1577,
      1740, 1920, 2118, 2337, 2579, 2846, 3140, 3464, 3822, 4217, 4653, 5134, 5665, 6250, 6896,
      7609, 8395, 9262, 10219, 11275, 12440, 13726, 15144, 16709, 18436, 20341, 22443, 24762, 27321,
      30144, 33259, 36696, 40488, 44672, 49288, 54381, 60000,
    ];

    assert.deepEqual(
      testBuckets,
      exponentialRange(DEFAULT_RANGE_MIN, DEFAULT_RANGE_MAX, DEFAULT_BUCKET_COUNT)
    );
  });

  it("default buckets correctly accumulate", function () {
    const hist = new Histogram(
      new PrecomputedExponential(DEFAULT_RANGE_MIN, DEFAULT_RANGE_MAX, DEFAULT_BUCKET_COUNT)
    );

    [1, 10, 100, 1000, 10000].forEach((i) => {
      hist.accumulate(i);
    });

    assert.equal(11111, hist.sum);
    assert.equal(5, hist.count);

    assert.equal(undefined, hist.values[0]); // underflow is empty
    assert.equal(1, hist.values[1]); // bucketRanges[1] = 1
    assert.equal(1, hist.values[10]); // bucketRanges[10] = 10
    assert.equal(1, hist.values[92]); // bucketRanges[33] = 92
    assert.equal(1, hist.values[964]); // bucketRanges[57] = 964
    assert.equal(1, hist.values[9262]); // bucketRanges[80] = 9262
  });

  it("accumulate large numbers", function () {
    const hist = new Histogram(new PrecomputedExponential(1, 500, 10));

    hist.accumulate(Number.MAX_SAFE_INTEGER);
    hist.accumulate(Number.MAX_SAFE_INTEGER);

    assert.equal(2, hist.count);
    // Saturate before overflowing
    assert.equal(Number.MAX_SAFE_INTEGER, hist.sum);
    assert.equal(2, hist.values[500]);
  });
});
