import os from "os";
const NodePlatformInfo = {
    async os() {
        switch (process.platform) {
            case "darwin":
                return Promise.resolve("Darwin");
            case "win32":
                return Promise.resolve("Windows");
            case "android":
                return Promise.resolve("Android");
            case "freebsd":
                return Promise.resolve("FreeBSD");
            case "linux":
                return Promise.resolve("Linux");
            case "openbsd":
                return Promise.resolve("OpenBSD");
            case "aix":
                return Promise.resolve("IBM_AIX");
            default:
                return Promise.resolve("Unknown");
        }
    },
    async osVersion() {
        return Promise.resolve(os.release() || "Unknown");
    },
    async arch() {
        return Promise.resolve(os.arch() || "Unknown");
    },
    async locale() {
        return Promise.resolve(Intl.DateTimeFormat().resolvedOptions().locale || "und");
    }
};
export default NodePlatformInfo;
