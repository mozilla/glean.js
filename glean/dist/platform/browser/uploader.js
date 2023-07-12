import log, { LoggingLevel } from "../../core/log.js";
import Uploader from "../../core/upload/uploader.js";
import { DEFAULT_UPLOAD_TIMEOUT_MS, UploadResult } from "../../core/upload/uploader.js";
const LOG_TAG = "platform.browser.Uploader";
class BrowserUploader extends Uploader {
    async post(url, body, headers = {}, keepalive = true) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), DEFAULT_UPLOAD_TIMEOUT_MS);
        let response;
        try {
            response = await fetch(url.toString(), {
                headers,
                method: "POST",
                body: body,
                keepalive,
                credentials: "omit",
                signal: controller.signal,
                redirect: "error",
            });
        }
        catch (e) {
            if (e instanceof DOMException) {
                log(LOG_TAG, ["Timeout while attempting to upload ping.\n", e], LoggingLevel.Error);
            }
            else if (e instanceof TypeError) {
                if (keepalive) {
                    return this.post(url, body, headers, false);
                }
                log(LOG_TAG, ["Network error while attempting to upload ping.\n", e], LoggingLevel.Error);
            }
            else {
                log(LOG_TAG, ["Unknown error while attempting to upload ping.\n", e], LoggingLevel.Error);
            }
            clearTimeout(timeout);
            return new UploadResult(0);
        }
        clearTimeout(timeout);
        return new UploadResult(2, response.status);
    }
}
export default new BrowserUploader();
