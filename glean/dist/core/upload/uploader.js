export const DEFAULT_UPLOAD_TIMEOUT_MS = 10000;
export var UploadResultStatus;
(function (UploadResultStatus) {
    UploadResultStatus[UploadResultStatus["RecoverableFailure"] = 0] = "RecoverableFailure";
    UploadResultStatus[UploadResultStatus["UnrecoverableFailure"] = 1] = "UnrecoverableFailure";
    UploadResultStatus[UploadResultStatus["Success"] = 2] = "Success";
})(UploadResultStatus || (UploadResultStatus = {}));
export class UploadResult {
    constructor(result, status) {
        this.result = result;
        this.status = status;
    }
}
export class Uploader {
}
export default Uploader;
