import { Context } from "../../context.js";
import log, { LoggingLevel } from "../../log.js";
import { isDeletionRequest } from "../../pings/database/shared.js";
import RateLimiter from "../rate_limiter.js";
import PingUploadWorker from "../worker/sync.js";
import Policy from "../policy.js";
import uploadTaskFactory from "../task.js";
import { UPLOAD_MANAGER_LOG_TAG } from "./shared.js";
class PingUploadManager {
    constructor(config, pingsDatabase, policy = new Policy(), rateLimiter = new RateLimiter()) {
        this.pingsDatabase = pingsDatabase;
        this.policy = policy;
        this.rateLimiter = rateLimiter;
        this.recoverableFailureCount = 0;
        this.waitAttemptCount = 0;
        this.queue = [];
        this.processing = new Set();
        this.worker = new PingUploadWorker(config.httpClient ? config.httpClient : Context.platform.uploader, config.serverEndpoint, policy);
        pingsDatabase.attachObserver(this);
    }
    getUploadTask() {
        const nextTask = this.getUploadTaskInternal();
        if (nextTask.type !== "wait" && this.waitAttemptCount > 0) {
            this.waitAttemptCount = 0;
        }
        if (nextTask.type !== "upload" && this.recoverableFailureCount > 0) {
            this.recoverableFailureCount = 0;
        }
        return nextTask;
    }
    processPingUploadResponse(ping, response) {
        const { identifier } = ping;
        this.processing.delete(identifier);
        const { status, result } = response;
        if (status && status >= 200 && status < 300) {
            log(UPLOAD_MANAGER_LOG_TAG, `Ping ${identifier} successfully sent ${status}.`, LoggingLevel.Info);
            this.pingsDatabase.deletePing(identifier);
            return;
        }
        if (result === 1 ||
            (status && status >= 400 && status < 500)) {
            log(UPLOAD_MANAGER_LOG_TAG, `Unrecoverable upload failure while attempting to send ping ${identifier}. Error was: ${status !== null && status !== void 0 ? status : "no status"}.`, LoggingLevel.Warn);
            this.pingsDatabase.deletePing(identifier);
            return;
        }
        log(UPLOAD_MANAGER_LOG_TAG, [
            `Recoverable upload failure while attempting to send ping ${identifier}, will retry.`,
            `Error was: ${status !== null && status !== void 0 ? status : "no status"}.`
        ], LoggingLevel.Warn);
        this.recoverableFailureCount++;
        this.enqueuePing(ping);
    }
    clearPendingPingsQueue() {
        this.queue = this.queue.filter((ping) => isDeletionRequest(ping));
    }
    update(identifier, ping) {
        this.enqueuePing({ identifier, ...ping });
        this.pingsDatabase.deletePing(identifier);
        this.worker.work(() => this.getUploadTask(), (ping, result) => this.processPingUploadResponse(ping, result));
    }
    enqueuePing(ping) {
        if (this.processing.has(ping.identifier)) {
            return;
        }
        for (const queuedPing of this.queue) {
            if (queuedPing.identifier === ping.identifier) {
                return;
            }
        }
        this.queue.push(ping);
    }
    getUploadTaskInternal() {
        if (this.recoverableFailureCount >= this.policy.maxRecoverableFailures) {
            log(UPLOAD_MANAGER_LOG_TAG, "Glean has reached maximum recoverable upload failures for the current uploading window.", LoggingLevel.Debug);
            return uploadTaskFactory.done();
        }
        if (this.queue.length > 0) {
            const { state, remainingTime } = this.rateLimiter.getState();
            if (state === 1) {
                log(UPLOAD_MANAGER_LOG_TAG, [
                    "Glean is currently throttled.",
                    `Pending pings may be uploaded in ${(remainingTime || 0) / 1000}s.`
                ], LoggingLevel.Debug);
                this.waitAttemptCount++;
                if (this.waitAttemptCount > this.policy.maxWaitAttempts) {
                    return uploadTaskFactory.done();
                }
                return uploadTaskFactory.wait(remainingTime || 0);
            }
            const nextPing = this.queue.shift();
            this.processing.add(nextPing.identifier);
            return uploadTaskFactory.upload(nextPing);
        }
        return uploadTaskFactory.done();
    }
}
export default PingUploadManager;
