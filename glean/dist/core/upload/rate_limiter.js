import { isUndefined, getMonotonicNow } from "../utils.js";
export const RATE_LIMITER_INTERVAL_MS = 60 * 1000;
export const MAX_PINGS_PER_INTERVAL = 40;
export var RateLimiterState;
(function (RateLimiterState) {
    RateLimiterState[RateLimiterState["Incrementing"] = 0] = "Incrementing";
    RateLimiterState[RateLimiterState["Throttled"] = 1] = "Throttled";
})(RateLimiterState || (RateLimiterState = {}));
class RateLimiter {
    constructor(interval = RATE_LIMITER_INTERVAL_MS, maxCount = MAX_PINGS_PER_INTERVAL, count = 0, started) {
        this.interval = interval;
        this.maxCount = maxCount;
        this.count = count;
        this.started = started;
    }
    get elapsed() {
        if (isUndefined(this.started)) {
            return NaN;
        }
        const now = getMonotonicNow();
        const result = now - this.started;
        if (result < 0) {
            return NaN;
        }
        return result;
    }
    reset() {
        this.started = getMonotonicNow();
        this.count = 0;
    }
    shouldReset() {
        if (isUndefined(this.started)) {
            return true;
        }
        if (isNaN(this.elapsed) || this.elapsed > this.interval) {
            return true;
        }
        return false;
    }
    getState() {
        if (this.shouldReset()) {
            this.reset();
        }
        const remainingTime = this.interval - this.elapsed;
        if (this.count >= this.maxCount) {
            return {
                state: 1,
                remainingTime,
            };
        }
        this.count++;
        return {
            state: 0
        };
    }
}
export default RateLimiter;
