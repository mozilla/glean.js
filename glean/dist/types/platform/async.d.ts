import type Store from "../core/storage/async.js";
import type Uploader from "../core/upload/uploader.js";
import type PlatformInfo from "../core/platform_info/async.js";
export declare type StorageBuilder = new (rootKey: string) => Store;
/**
 * An interface describing all the platform specific APIs Glean.js needs to access.
 *
 * Each supported platform must provide an implementation of this interface.
 */
interface Platform {
    Storage: StorageBuilder;
    uploader: Uploader;
    info: PlatformInfo;
    timer: {
        setTimeout: (cb: () => void, timeout: number) => number;
        clearTimeout: (id: number) => void;
    };
    name: string;
}
export default Platform;
