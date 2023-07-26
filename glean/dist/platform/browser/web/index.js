import uploader from "../uploader.js";
import info from "./platform_info.js";
import Storage from "./storage.js";
const WebPlatform = {
    Storage,
    uploader,
    info,
    timer: { setTimeout, clearTimeout },
    name: "web"
};
export default WebPlatform;
