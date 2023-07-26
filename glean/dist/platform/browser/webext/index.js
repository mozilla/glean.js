import Storage from "./storage.js";
import uploader from "../uploader.js";
import info from "./platform_info.js";
const WebExtPlatform = {
    Storage,
    uploader,
    info,
    timer: { setTimeout, clearTimeout },
    name: "webext"
};
export default WebExtPlatform;
