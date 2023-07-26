const WebExtPlatformInfo = {
    async os() {
        const platformInfo = await browser.runtime.getPlatformInfo();
        switch (platformInfo.os) {
            case "mac":
                return "Darwin";
            case "win":
                return "Windows";
            case "android":
                return "Android";
            case "cros":
                return "ChromeOS";
            case "linux":
                return "Linux";
            case "openbsd":
                return "OpenBSD";
            default:
                return "Unknown";
        }
    },
    async osVersion() {
        return Promise.resolve("Unknown");
    },
    async arch() {
        const platformInfo = await browser.runtime.getPlatformInfo();
        return platformInfo.arch;
    },
    async locale() {
        return Promise.resolve(navigator.language || "und");
    }
};
export default WebExtPlatformInfo;
