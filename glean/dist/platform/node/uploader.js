import https from "https";
import http from "http";
import { isString } from "../../core/utils.js";
import log, { LoggingLevel } from "../../core/log.js";
import Uploader, { UploadResult, DEFAULT_UPLOAD_TIMEOUT_MS } from "../../core/upload/uploader.js";
const LOG_TAG = "platform.node.Uploader";
class NodeUploader extends Uploader {
    post(url, body, headers) {
        return new Promise(resolve => {
            const parsedURL = new URL(url);
            const mod = parsedURL.protocol === "http:" ? http : https;
            const request = mod.request({
                hostname: parsedURL.hostname,
                path: parsedURL.pathname,
                port: parsedURL.port,
                headers,
                method: "POST",
                timeout: DEFAULT_UPLOAD_TIMEOUT_MS
            }, response => {
                response.resume();
                response.once("end", () => {
                    resolve(new UploadResult(2, response.statusCode));
                });
            });
            request.on("timeout", () => {
                log(LOG_TAG, "Timeout while attempting to upload ping.", LoggingLevel.Error);
                request.destroy();
                resolve(new UploadResult(0));
            });
            request.on("error", error => {
                log(LOG_TAG, ["Network error while attempting to upload ping.\n", error.message], LoggingLevel.Error);
                resolve(new UploadResult(0));
            });
            request.end(isString(body) ? body : Buffer.from(body.buffer));
        });
    }
}
export default new NodeUploader();
