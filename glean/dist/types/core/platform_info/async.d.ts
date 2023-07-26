import type { IPlatformInfo, KnownOperatingSystems } from "../platform_info/shared.js";
interface PlatformInfo extends IPlatformInfo {
    os(): Promise<KnownOperatingSystems>;
    osVersion(fallback?: string): Promise<string>;
    arch(fallback?: string): Promise<string>;
    locale(): Promise<string>;
}
export default PlatformInfo;
