/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Storage from "platform/webext/storage";
import uploader from "platform/webext/uploader";
import info from "platform/webext/platform_info";

import Platform from "platform/index";

const WebExtPlatform: Platform = {
  Storage,
  uploader,
  info,
};

export default WebExtPlatform;
