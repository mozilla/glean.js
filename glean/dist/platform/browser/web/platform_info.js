const BrowserPlatformInfo = {
    os() {
        let ua;
        if (!!navigator && !!navigator.userAgent) {
            ua = navigator.userAgent;
        }
        else {
            ua = "Unknown";
        }
        if (ua.includes("Windows")) {
            return "Windows";
        }
        if (/tvOS/i.test(ua)) {
            return "TvOS";
        }
        if (/Watch( OS)?/i.test(ua)) {
            return "WatchOS";
        }
        if (/iPhone|iPad|iOS/i.test(ua)) {
            return "iOS";
        }
        if (/Mac OS X|macOS/i.test(ua)) {
            return "Darwin";
        }
        if (/Android/i.test(ua)) {
            return "Android";
        }
        if (/CrOS/i.test(ua)) {
            return "ChromeOS";
        }
        if (/WebOS/i.test(ua)) {
            return "WebOS";
        }
        if (/Linux/i.test(ua)) {
            return "Linux";
        }
        if (/OpenBSD/i.test(ua)) {
            return "OpenBSD";
        }
        if (/FreeBSD/i.test(ua)) {
            return "FreeBSD";
        }
        if (/NetBSD/i.test(ua)) {
            return "NetBSD";
        }
        if (/SunOS/i.test(ua)) {
            return "SunOS";
        }
        if (/AIX/i.test(ua)) {
            return "IBM_AIX";
        }
        return "Unknown";
    },
    osVersion() {
        return "Unknown";
    },
    arch() {
        return "Unknown";
    },
    locale() {
        return navigator.language || "und";
    }
};
export default BrowserPlatformInfo;
