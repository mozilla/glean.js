/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { isUndefined, getMonotonicNow } from "../utils.js";

// Default rate limiter interval, in milliseconds.
export const RATE_LIMITER_INTERVAL_MS = 60 * 1000;
// Default max pings per internal.
export const MAX_PINGS_PER_INTERVAL = 40;

/**
 * An enum to represent the current state of the RateLimiter.
 */
export const enum RateLimiterState {
  // The RateLimiter has not reached the maximum count and is still incrementing.
  Incrementing,
  // The RateLimiter has reached the maximum count for the current interval.
  Throttled,
}

class RateLimiter {
  constructor(
    // The duration of each interval, in millisecods.
    private interval: number = RATE_LIMITER_INTERVAL_MS,
    // The maximum count per interval.
    private maxCount: number = MAX_PINGS_PER_INTERVAL,
    // The count for the current interval.
    private count: number = 0,
    // The instant the current interval has started, in milliseconds.
    private started?: number,
  ) {}

  get elapsed(): number {
    if (isUndefined(this.started)) {
      return NaN;
    }

    const now = getMonotonicNow();
    const result = now - this.started;

    // It's very unlikely elapsed will be a negative number since we are using a monotonic timer
    // here, but just to be extra sure, we account for it.
    if (result < 0) {
      return NaN;
    }

    return result;
  }

  private reset(): void {
    this.started = getMonotonicNow();
    this.count = 0;
  }

  /**
   * The rate limiter should reset if
   *
   * 1. It has never started i.e. `started` is still `undefined`;
   * 2. It has been started more than the interval time ago;
   * 3. Something goes wrong while trying to calculate the elapsed time since the last reset.
   *
   * @returns Whether or not this rate limiter should reset.
   */
  private shouldReset(): boolean {
    if (isUndefined(this.started)) {
      return true;
    }

    if (isNaN(this.elapsed) || this.elapsed > this.interval) {
      return true;
    }

    return false;
  }

  /**
   * Tries to increment the internal counter.
   *
   * @returns The current state of the RateLimiter plus the remaining time
   *          (in milliseconds) until the end of the current window.
   */
  getState(): {
    state: RateLimiterState,
    remainingTime?: number,
    } {
    if (this.shouldReset()) {
      this.reset();
    }

    const remainingTime = this.interval - this.elapsed;
    if (this.count >= this.maxCount) {
      return {
        state: RateLimiterState.Throttled,
        remainingTime,
      };
    }

    this.count++;
    return {
      state: RateLimiterState.Incrementing
    };
  }
}

export default RateLimiter;
