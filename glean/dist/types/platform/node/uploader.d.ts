import Uploader, { UploadResult } from "../../core/upload/uploader.js";
declare class NodeUploader extends Uploader {
    post(url: string, body: string | Uint8Array, headers?: Record<string, string>): Promise<UploadResult>;
}
declare const _default: NodeUploader;
export default _default;
