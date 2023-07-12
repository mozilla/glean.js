import platform from "../platform/browser/webext/index.js";
import { baseAsync } from "./base/async.js";
export { default as Uploader, UploadResult, UploadResultStatus } from "../core/upload/uploader.js";
export default baseAsync(platform);
