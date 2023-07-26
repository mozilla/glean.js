import platform from "../platform/browser/web/index.js";
import { baseSync } from "./base/sync.js";
export { default as Uploader, UploadResult, UploadResultStatus } from "../core/upload/uploader.js";
export default baseSync(platform);
