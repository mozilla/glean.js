import MockStorage from "../test/storage.js";
import Uploader from "../../core/upload/uploader.js";
import { UploadResult } from "../../core/upload/uploader.js";
class MockUploader extends Uploader {
    post(_url, _body, _headers) {
        const result = new UploadResult(2, 200);
        return Promise.resolve(result);
    }
}
const MockPlatformInfo = {
    os() {
        return Promise.resolve("Unknown");
    },
    osVersion() {
        return Promise.resolve("Unknown");
    },
    arch() {
        return Promise.resolve("Unknown");
    },
    locale() {
        return Promise.resolve("Unknown");
    },
};
const safeSetTimeout = typeof setTimeout !== "undefined" ? setTimeout : () => { throw new Error(); };
const safeClearTimeout = typeof clearTimeout !== "undefined" ? clearTimeout : () => { };
const TestPlatform = {
    Storage: MockStorage,
    uploader: new MockUploader(),
    info: MockPlatformInfo,
    timer: { setTimeout: safeSetTimeout, clearTimeout: safeClearTimeout },
    name: "test"
};
export default TestPlatform;
