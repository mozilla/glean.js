import type Plugin from "../plugins/index.js";
import type Uploader from "./upload/uploader.js";
/**
 * Lists Glean's debug options.
 */
export interface DebugOptions {
    logPings?: boolean;
    debugViewTag?: string;
    sourceTags?: string[];
}
/**
 * Describes how to configure Glean.
 */
export interface ConfigurationInterface {
    readonly channel?: string;
    readonly appBuild?: string;
    readonly appDisplayVersion?: string;
    readonly serverEndpoint?: string;
    readonly maxEvents?: number;
    plugins?: Plugin[];
    httpClient?: Uploader;
    readonly architecture?: string;
    readonly osVersion?: string;
    readonly buildDate?: Date;
}
export declare class Configuration implements ConfigurationInterface {
    readonly channel?: string;
    readonly appBuild?: string;
    readonly appDisplayVersion?: string;
    readonly serverEndpoint: string;
    readonly architecture?: string;
    readonly osVersion?: string;
    readonly buildDate?: Date;
    readonly maxEvents: number;
    debug: DebugOptions;
    httpClient?: Uploader;
    constructor(config?: ConfigurationInterface);
    get logPings(): boolean;
    set logPings(flag: boolean);
    get debugViewTag(): string | undefined;
    set debugViewTag(tag: string | undefined);
    get sourceTags(): string[] | undefined;
    set sourceTags(tags: string[] | undefined);
}
