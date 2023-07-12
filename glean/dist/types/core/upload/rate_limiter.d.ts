export declare const RATE_LIMITER_INTERVAL_MS: number;
export declare const MAX_PINGS_PER_INTERVAL = 40;
/**
 * An enum to represent the current state of the RateLimiter.
 */
export declare const enum RateLimiterState {
    Incrementing = 0,
    Throttled = 1
}
declare class RateLimiter {
    private interval;
    private maxCount;
    private count;
    private started?;
    constructor(interval?: number, maxCount?: number, count?: number, started?: number | undefined);
    get elapsed(): number;
    private reset;
    /**
     * The rate limiter should reset if
     *
     * 1. It has never started i.e. `started` is still `undefined`;
     * 2. It has been started more than the interval time ago;
     * 3. Something goes wrong while trying to calculate the elapsed time since the last reset.
     *
     * @returns Whether or not this rate limiter should reset.
     */
    private shouldReset;
    /**
     * Tries to increment the internal counter.
     *
     * @returns The current state of the RateLimiter plus the remaining time
     *          (in milliseconds) until the end of the current window.
     */
    getState(): {
        state: RateLimiterState;
        remainingTime?: number;
    };
}
export default RateLimiter;
