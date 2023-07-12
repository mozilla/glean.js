import type { OptionalAsync } from "../types";
export declare const enum KnownOperatingSystems {
    Android = "Android",
    iOS = "iOS",
    Linux = "Linux",
    MacOS = "Darwin",
    Windows = "Windows",
    FreeBSD = "FreeBSD",
    NetBSD = "NetBSD",
    OpenBSD = "OpenBSD",
    Solaris = "Solaris",
    Unknown = "Unknown",
    ChromeOS = "ChromeOS",
    TvOS = "TvOS",
    Qnx = "QNX",
    Wasm = "Wasm",
    SunOS = "SunOS",
    AIX = "IBM_AIX",
    WatchOS = "WatchOS",
    WebOS = "WebOS"
}
export interface IPlatformInfo {
    /**
     * Gets and returns the current OS system.
     *
     * @returns The current OS.
     */
    os(): OptionalAsync<KnownOperatingSystems>;
    /**
     * Gets and returns the current OS system version.
     *
     * @param fallback A fallback value in case Glean is unable to retrieve this value from the environment.
     * @returns The current OS version.
     */
    osVersion(fallback?: string): OptionalAsync<string>;
    /**
     * Gets and returns the current system architecture.
     *
     * @param fallback A fallback value in case Glean is unable to retrieve this value from the environment.
     * @returns The current system architecture.
     */
    arch(fallback?: string): OptionalAsync<string>;
    /**
     * Gets and returns the current system / browser locale.
     *
     * @returns The current system / browser locale.
     */
    locale(): OptionalAsync<string>;
}
