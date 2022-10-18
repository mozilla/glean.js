/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import { Histogram } from "../../../../src/histogram/histogram";
import { linearRange, PrecomputedLinear } from "../../../../src/histogram/linear";

const DEFAULT_BUCKET_COUNT = 100;
const DEFAULT_RANGE_MIN = 0;
const DEFAULT_RANGE_MAX = 100;

describe("Linear Histograms", function () {
  it("can count", function () {
    const hist = new Histogram(new PrecomputedLinear(1, 500, 10));
    assert.ok(hist.isEmpty());

    for (let i = 1; i <= 10; i++) {
      hist.accumulate(i);
    }

    assert.equal(10, hist.count);
    assert.equal(55, hist.sum);
  });

  it("overflow values accumulate in the last bucket", function () {
    const hist = new Histogram(
      new PrecomputedLinear(DEFAULT_RANGE_MIN, DEFAULT_RANGE_MAX, DEFAULT_BUCKET_COUNT)
    );

    hist.accumulate(DEFAULT_RANGE_MAX + 100);
    assert.equal(1, hist.values[DEFAULT_RANGE_MAX]);
  });

  it("short linear buckets are correct", function () {
    const testBuckets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10];

    assert.deepEqual(testBuckets, linearRange(1, 10, 10));
    // There's always a zero bucket, so we increase the lower limit.
    assert.deepEqual(testBuckets, linearRange(0, 10, 10));
  });

  it("long linear buckets are correct", function () {
    const testBuckets = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
      49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71,
      72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94,
      95, 96, 97, 98, 100,
    ];

    assert.deepEqual(
      testBuckets,
      linearRange(DEFAULT_RANGE_MIN, DEFAULT_RANGE_MAX, DEFAULT_BUCKET_COUNT)
    );
  });

  it("default buckets correctly accumulate", function () {
    const hist = new Histogram(
      new PrecomputedLinear(DEFAULT_RANGE_MIN, DEFAULT_RANGE_MAX, DEFAULT_BUCKET_COUNT)
    );

    [1, 10, 100, 1000, 10000].forEach((i) => {
      hist.accumulate(i);
    });

    assert.equal(11111, hist.sum);
    assert.equal(5, hist.count);

    assert.equal(undefined, hist.values[0]);
    assert.equal(1, hist.values[1]);
    assert.equal(1, hist.values[10]);
    assert.equal(3, hist.values[100]);
  });

  it("accumulate large numbers", function () {
    const hist = new Histogram(new PrecomputedLinear(1, 500, 10));

    hist.accumulate(Number.MAX_SAFE_INTEGER);
    hist.accumulate(Number.MAX_SAFE_INTEGER);

    assert.equal(2, hist.count);
    assert.equal(Number.MAX_SAFE_INTEGER, hist.sum);
    assert.equal(2, hist.values[500]);
  });
});
