export const PING_UPLOAD_WORKER_LOG_TAG = "core.Upload.PingUploadWorker";
export class PingBodyOverflowError extends Error {
    constructor(message) {
        super(message);
        this.name = "PingBodyOverflow";
    }
}
