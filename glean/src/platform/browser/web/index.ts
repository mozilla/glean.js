/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type Platform from "../../index.js";

import uploader from "../fetch_uploader.js";
import info from "./platform_info.js";
import Storage from "./storage.js";

const WebPlatform: Platform = {
  Storage,
  uploader,
  info,
  timer: { setTimeout, clearTimeout },
  name: "web"
};

export default WebPlatform;
