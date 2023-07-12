import Uploader from "../../core/upload/uploader.js";
import { UploadResult } from "../../core/upload/uploader.js";
declare class BrowserUploader extends Uploader {
    post(url: string, body: string | Uint8Array, headers?: Record<string, string>, keepalive?: boolean): Promise<UploadResult>;
}
declare const _default: BrowserUploader;
export default _default;
