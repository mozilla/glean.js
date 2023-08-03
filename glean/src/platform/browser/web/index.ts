/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type PlatformSync from "../../sync.js";

import uploader from "../uploader.js";
import info from "./platform_info.js";
import Storage from "./storage.js";

const WebPlatform: PlatformSync = {
  Storage,
  uploader,
  info,
  timer: { setTimeout, clearTimeout },
  name: "web"
};

export default WebPlatform;
