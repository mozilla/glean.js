/**
 * Policies for ping storage, uploading and requests.
 */
export default class Policy {
    readonly maxWaitAttempts: number;
    readonly maxRecoverableFailures: number;
    readonly maxPingBodySize: number;
    constructor(maxWaitAttempts?: number, maxRecoverableFailures?: number, maxPingBodySize?: number);
}
