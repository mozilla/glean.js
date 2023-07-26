import type { QueuedPing } from "../manager/shared.js";
import type Uploader from "../uploader.js";
import type { UploadTask } from "../task.js";
import Policy from "../policy.js";
import { UploadResult } from "../uploader.js";
declare class PingUploadWorkerSync {
    private readonly uploader;
    private readonly serverEndpoint;
    private readonly policy;
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
     * Kick start non-blocking asynchronous internal loop to get and act on upload tasks.
     *
     * If a job is currently ongoing, this is a no-op.
     *
     * @param getUploadTask A function that returns an UploadTask.
     * @param processUploadResponse A function that processes an UploadResponse.
     */
    work(getUploadTask: () => UploadTask, processUploadResponse: (ping: QueuedPing, result: UploadResult) => void): void;
}
export default PingUploadWorkerSync;
