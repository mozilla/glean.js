import type { Configuration } from "../../config.js";
import type { PingInternalRepresentation } from "../../pings/database/shared.js";
import type PingsDatabase from "../../pings/database/async.js";
import type { UploadResult } from "../uploader.js";
import type { UploadTask } from "../task.js";
import type { IPingUploadManager, QueuedPing } from "./shared.js";
import RateLimiter from "../rate_limiter.js";
import Policy from "../policy.js";
declare class PingUploadManager implements IPingUploadManager {
    private readonly pingsDatabase;
    private readonly policy;
    private readonly rateLimiter;
    private queue;
    private processing;
    private worker;
    private recoverableFailureCount;
    private waitAttemptCount;
    constructor(config: Configuration, pingsDatabase: PingsDatabase, policy?: Policy, rateLimiter?: RateLimiter);
    getUploadTask(): UploadTask;
    processPingUploadResponse(ping: QueuedPing, response: UploadResult): Promise<void>;
    clearPendingPingsQueue(): Promise<void>;
    blockOnOngoingUploads(): Promise<void>;
    update(identifier: string, ping: PingInternalRepresentation): void;
    /**
     * Enqueues a new ping at the end of the queue.
     *
     * Will not enqueue if a ping with the same identifier is already enqueued
     * or is currently being processed.
     *
     * @param ping The ping to enqueue.
     */
    private enqueuePing;
    private getUploadTaskInternal;
}
export default PingUploadManager;
