export default class Policy {
    constructor(maxWaitAttempts = 3, maxRecoverableFailures = 3, maxPingBodySize = 1024 * 1024) {
        this.maxWaitAttempts = maxWaitAttempts;
        this.maxRecoverableFailures = maxRecoverableFailures;
        this.maxPingBodySize = maxPingBodySize;
    }
}
