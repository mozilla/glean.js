import { gzipSync, strToU8 } from "fflate";
import { GLEAN_VERSION } from "../../constants.js";
import { Context } from "../../context.js";
import log, { LoggingLevel } from "../../log.js";
import Policy from "../policy.js";
import { UploadResult } from "../uploader.js";
const LOG_TAG = "core.Upload.PingUploadWorker";
class PingBodyOverflowError extends Error {
    constructor(message) {
        super(message);
        this.name = "PingBodyOverflow";
    }
}
class PingUploadWorker {
    constructor(uploader, serverEndpoint, policy = new Policy()) {
        this.uploader = uploader;
        this.serverEndpoint = serverEndpoint;
        this.policy = policy;
        this.isBlocking = false;
    }
    async buildPingRequest(ping) {
        let headers = ping.headers || {};
        headers = {
            ...ping.headers,
            "Content-Type": "application/json; charset=utf-8",
            Date: new Date().toISOString(),
            "X-Telemetry-Agent": `Glean/${GLEAN_VERSION} (JS on ${await Context.platform.info.os()})`
        };
        const stringifiedBody = JSON.stringify(ping.payload);
        const encodedBody = strToU8(stringifiedBody);
        let finalBody;
        let bodySizeInBytes;
        try {
            finalBody = gzipSync(encodedBody);
            bodySizeInBytes = finalBody.length;
            headers["Content-Encoding"] = "gzip";
        }
        catch (_a) {
            finalBody = stringifiedBody;
            bodySizeInBytes = encodedBody.length;
        }
        if (bodySizeInBytes > this.policy.maxPingBodySize) {
            throw new PingBodyOverflowError(`Body for ping ${ping.identifier} exceeds ${this.policy.maxPingBodySize}bytes. Discarding.`);
        }
        headers["Content-Length"] = bodySizeInBytes.toString();
        return {
            headers,
            payload: finalBody
        };
    }
    async attemptPingUpload(ping) {
        try {
            const finalPing = await this.buildPingRequest(ping);
            return await this.uploader.post(`${this.serverEndpoint}${ping.path}`, finalPing.payload, finalPing.headers);
        }
        catch (e) {
            log(LOG_TAG, ["Error trying to build or post ping request:", e], LoggingLevel.Warn);
            return new UploadResult(1);
        }
    }
    async workInternal(getUploadTask, processUploadResponse) {
        while (true) {
            const nextTask = getUploadTask();
            switch (nextTask.type) {
                case "upload":
                    const result = await this.attemptPingUpload(nextTask.ping);
                    await processUploadResponse(nextTask.ping, result);
                    continue;
                case "wait":
                    if (this.isBlocking) {
                        return;
                    }
                    try {
                        const wasAborted = await new Promise((resolve) => {
                            this.waitPromiseResolver = resolve;
                            this.waitTimeoutId = Context.platform.timer.setTimeout(() => {
                                this.waitPromiseResolver = undefined;
                                this.waitTimeoutId = undefined;
                                resolve(false);
                            }, nextTask.remainingTime);
                        });
                        if (wasAborted) {
                            return;
                        }
                    }
                    catch (_) {
                        this.waitPromiseResolver = undefined;
                        this.waitTimeoutId = undefined;
                        return;
                    }
                    continue;
                case "done":
                    return;
            }
        }
    }
    work(getUploadTask, processUploadResponse) {
        if (!this.currentJob) {
            this.currentJob = this.workInternal(getUploadTask, processUploadResponse)
                .then(() => {
                this.currentJob = undefined;
            })
                .catch((error) => {
                log(LOG_TAG, ["IMPOSSIBLE: Something went wrong while processing ping upload tasks.", error], LoggingLevel.Error);
            });
        }
    }
    async blockOnCurrentJob() {
        if (this.currentJob) {
            if (this.waitTimeoutId && this.waitPromiseResolver) {
                Context.platform.timer.clearTimeout(this.waitTimeoutId);
                this.waitPromiseResolver(true);
                this.waitPromiseResolver = undefined;
                this.waitTimeoutId = undefined;
            }
            this.isBlocking = true;
            await this.currentJob;
            this.isBlocking = false;
            return;
        }
        return Promise.resolve();
    }
}
export default PingUploadWorker;
