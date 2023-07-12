import type { IPlatformInfo, KnownOperatingSystems } from "../platform_info/shared.js";
interface PlatformInfoSync extends IPlatformInfo {
    os(): KnownOperatingSystems;
    osVersion(fallback?: string): string;
    arch(fallback?: string): string;
    locale(): string;
}
export default PlatformInfoSync;
