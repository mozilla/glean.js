import type CommonPingData from "./common_ping_data.js";
declare type ValidatorFunction = (reason?: string) => Promise<void>;
declare type PromiseCallback = (value: void | PromiseLike<void>) => void;
export declare class InternalPingType implements CommonPingData {
    readonly name: string;
    readonly includeClientId: boolean;
    readonly sendIfEmpty: boolean;
    readonly reasonCodes: string[];
    private resolveTestPromiseFunction?;
    private rejectTestPromiseFunction?;
    private testCallback?;
    constructor(meta: CommonPingData);
    submit(reason?: string): void;
    submitAsync(reason?: string): void;
    private internalSubmit;
    /**
     * An implementation of `submit` that does not dispatch the submission task.
     *
     * # Important
     *
     * This method should **never** be exposed to users.
     *
     * @param reason The reason the ping was triggered. Included in the
     *               `ping_info.reason` part of the payload.
     * @param testResolver The asynchronous validation function to run in order to validate
     *        the ping content.
     */
    submitUndispatched(reason?: string, testResolver?: PromiseCallback): Promise<void>;
    submitSync(reason?: string): void;
    private internalSubmitSync;
    testBeforeNextSubmit(callbackFn: ValidatorFunction): Promise<void>;
}
/**
 * Stores information about a ping.
 *
 * This is required so that given metric data queued on disk we can send
 * pings with the correct settings, e.g. whether it has a client_id.
 */
export default class {
    #private;
    constructor(meta: CommonPingData);
    /**
     * Collects and submits a ping for eventual uploading.
     *
     * The ping content is assembled as soon as possible, but upload is not
     * guaranteed to happen immediately, as that depends on the upload policies.
     *
     * If the ping currently contains no content, it will not be sent,
     * unless it is configured to be sent if empty.
     *
     * @param reason The reason the ping was triggered. Included in the
     *               `ping_info.reason` part of the payload.
     */
    submit(reason?: string): void;
    /**
     * Test-only API
     *
     * Runs a validation function before the ping is collected.
     *
     * @param callbackFn The asynchronous validation function to run in order to validate
     *        the ping content.
     * @returns A `Promise` resolved when the ping is collected and the validation function
     *          is executed.
     */
    testBeforeNextSubmit(callbackFn: ValidatorFunction): Promise<void>;
}
export {};
