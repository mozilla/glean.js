/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import type { SinonFakeTimers } from "sinon";
import sinon from "sinon";

import RateLimiter, { RateLimiterState } from "../../../../src/core/upload/rate_limiter";

const sandbox = sinon.createSandbox();
const now = new Date();


describe("RateLimiter", function() {
  let clock: SinonFakeTimers;

  beforeEach(function() {
    clock = sandbox.useFakeTimers(now.getTime());
  });

  afterEach(function () {
    clock.restore();
  });

  it("rate limiter correctly resets in case elapsed time return an error", function () {
    const rateLimiter = new RateLimiter(
      1000, /* interval */
      3, /* maxCount */
    );

    // Reach the count for the current interval.
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });

    sinon.replaceGetter(rateLimiter, "elapsed", () => NaN);
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });
  });

  it("rate limiter correctly resets in case interval is over", function () {
    const rateLimiter = new RateLimiter(
      1000, /* interval */
      3, /* maxCount */
    );

    // Reach the count for the current interval.
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });

    // Fake the time passing over the current interval
    sinon.replaceGetter(rateLimiter, "elapsed", () => 1000 * 2);
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });
  });

  it("rate limiter returns throttled state when it is throttled", function () {
    const rateLimiter = new RateLimiter(
      1000, /* interval */
      3, /* maxCount */
    );

    // Reach the count for the current interval.
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });
    assert.deepStrictEqual(rateLimiter.getState(), { state: RateLimiterState.Incrementing });

    // Try one more time and we should be throttled.
    const nextState = rateLimiter.getState();
    assert.strictEqual(nextState.state, RateLimiterState.Throttled);
    assert.ok(nextState.remainingTime as number <= 1000 && nextState.remainingTime as number > 0);
  });
});
