import { gzipSync, strToU8 } from "fflate";
import { GLEAN_VERSION } from "../../constants.js";
import { Context } from "../../context.js";
import log, { LoggingLevel } from "../../log.js";
import Policy from "../policy.js";
import { UploadResult } from "../uploader.js";
import { PingBodyOverflowError, PING_UPLOAD_WORKER_LOG_TAG } from "./shared.js";
class PingUploadWorkerSync {
    constructor(uploader, serverEndpoint, policy = new Policy()) {
        this.uploader = uploader;
        this.serverEndpoint = serverEndpoint;
        this.policy = policy;
    }
    buildPingRequest(ping) {
        let headers = ping.headers || {};
        headers = {
            ...ping.headers,
            "Content-Type": "application/json; charset=utf-8",
            Date: new Date().toISOString(),
            "X-Telemetry-Agent": `Glean/${GLEAN_VERSION} (JS on ${Context.platform.info.os()})`
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
            const finalPing = this.buildPingRequest(ping);
            return this.uploader.post(`${this.serverEndpoint}${ping.path}`, finalPing.payload, finalPing.headers);
        }
        catch (e) {
            log(PING_UPLOAD_WORKER_LOG_TAG, ["Error trying to build or post ping request:", e], LoggingLevel.Warn);
            return new UploadResult(1);
        }
    }
    work(getUploadTask, processUploadResponse) {
        try {
            const task = getUploadTask();
            switch (task.type) {
                case "upload":
                    this.attemptPingUpload(task.ping)
                        .then((result) => {
                        processUploadResponse(task.ping, result);
                    })
                        .catch((error) => {
                        console.log(error);
                    });
            }
        }
        catch (error) {
            log(PING_UPLOAD_WORKER_LOG_TAG, ["IMPOSSIBLE: Something went wrong while processing ping upload tasks.", error], LoggingLevel.Error);
        }
    }
}
export default PingUploadWorkerSync;
