import PlatformInfo from "./platform_info.js";
import Uploader from "./uploader.js";
import TestPlatform from "../test/index.js";
const NodePlatform = {
    ...TestPlatform,
    uploader: Uploader,
    info: PlatformInfo,
    timer: { setTimeout, clearTimeout },
    name: "node"
};
export default NodePlatform;
