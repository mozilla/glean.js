/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";

import { Histogram } from "../../../../src/histogram/histogram";
import { Functional } from "../../../../src/histogram/functional";

describe("Functional Histograms", function () {
  it("can count", function () {
    const hist = new Histogram(new Functional(2.0, 8.0));
    assert.ok(hist.isEmpty());

    for (let i = 1; i <= 10; i++) {
      hist.accumulate(i);
    }

    assert.equal(10, hist.count);
    assert.equal(55, hist.sum);
  });

  it("sample to bucket minimum correctly rounds down", function () {
    const hist = new Histogram(new Functional(2.0, 8.0));

    // Check each of the first 100 integers, where numerical accuracy of the round-tripping
    // is most potentially problematic
    for (let i = 0; i < 100; i++) {
      const bucketMinimum = hist.bucketing.sampleToBucketMinimum(i);
      assert.ok(bucketMinimum <= i);
      assert.equal(bucketMinimum, hist.bucketing.sampleToBucketMinimum(bucketMinimum));
    }
  });
});
