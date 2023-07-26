import type SynchronousStore from "../core/storage/sync.js";
import type Uploader from "../core/upload/uploader.js";
import type PlatformInfoSync from "../core/platform_info/sync.js";
export declare type StorageBuilder = new (rootKey: string) => SynchronousStore;
/**
 * An interface describing all the platform specific APIs Glean.js needs to access.
 *
 * Each supported platform must provide an implementation of this interface.
 */
interface PlatformSync {
    Storage: StorageBuilder;
    uploader: Uploader;
    info: PlatformInfoSync;
    timer: {
        setTimeout: (cb: () => void, timeout: number) => number;
        clearTimeout: (id: number) => void;
    };
    name: string;
}
export default PlatformSync;
