import type { QueuedPing } from "../manager/shared.js";
import type Uploader from "../uploader.js";
import type { UploadTask } from "../task.js";
import Policy from "../policy.js";
import { UploadResult } from "../uploader.js";
declare class PingUploadWorker {
    private readonly uploader;
    private readonly serverEndpoint;
    private readonly policy;
    private currentJob?;
    private isBlocking;
    private waitTimeoutId?;
    private waitPromiseResolver?;
    constructor(uploader: Uploader, serverEndpoint: string, policy?: Policy);
    /**
     * Builds a ping request.
     *
     * This includes:
     *
     * 1. Includes Glean required headers to the ping;
     *    These are the headers described in https://mozilla.github.io/glean/book/user/pings/index.html?highlight=headers#submitted-headers
     * 2. Stringifies the body.
     *
     * @param ping The ping to include the headers in.
     * @returns The updated ping.
     */
    private buildPingRequest;
    /**
     * Attempts to upload a ping.
     *
     * @param ping The ping object containing headers and payload.
     * @returns The status number of the response or `undefined` if unable to attempt upload.
     */
    private attemptPingUpload;
    /**
     * Start a loop to get queued pings and attempt upload.
     *
     * @param getUploadTask A function that returns an UploadTask.
     * @param processUploadResponse A function that processes an UploadResponse.
     * @returns A promise which resolves on a Done_UploadTask is received.
     */
    private workInternal;
    /**
     * Kick start non-blocking asynchronous internal loop to get and act on upload tasks.
     *
     * If a job is currently ongoing, this is a no-op.
     *
     * @param getUploadTask A function that returns an UploadTask.
     * @param processUploadResponse A function that processes an UploadResponse.
     */
    work(getUploadTask: () => UploadTask, processUploadResponse: (ping: QueuedPing, result: UploadResult) => Promise<void>): void;
    /**
     * Allows to wait for current job completion.
     *
     * # Warning
     *
     * Use only at times when you know it is not possible for this to hang too long
     * i.e. at times when you know how many pings are enqueued.
     *
     * @returns A promise which resolves once the current ongoing job is complete.
     *          If there is no ongoing job, the returned promise will resolve immediately.
     */
    blockOnCurrentJob(): Promise<void>;
}
export default PingUploadWorker;
