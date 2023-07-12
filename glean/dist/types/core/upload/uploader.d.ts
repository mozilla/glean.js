export declare const DEFAULT_UPLOAD_TIMEOUT_MS = 10000;
/**
 * The resulting status of an attempted ping upload.
 */
export declare const enum UploadResultStatus {
    RecoverableFailure = 0,
    UnrecoverableFailure = 1,
    Success = 2
}
/**
 * The result of an attempted ping upload.
 */
export declare class UploadResult {
    readonly result: UploadResultStatus;
    readonly status?: number | undefined;
    constructor(result: UploadResultStatus, status?: number | undefined);
}
/**
 * Uploader abstract class, actual uploading logic varies per platform.
 */
export declare abstract class Uploader {
    /**
     * Makes a POST request to a given url, with the given headers and body.
     *
     * @param url The URL to make the POST request
     * @param body The body of this post request. The body may be a stringified JSON or, most likely,
     *        a Uint8Array containing the gzipped version of said stringified JSON. We need to accept
     *        both in case the compression fails.
     * @param headers Optional headers to include in the request
     * @returns The status code of the response.
     */
    abstract post(url: string, body: string | Uint8Array, headers?: Record<string, string>): Promise<UploadResult>;
}
export default Uploader;
