/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import platform from "../platform/node/index.js";
import base from "./base.js";

// Import a random package to change the size.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as tslib from "tslib";
console.log(JSON.stringify(tslib));

export { ErrorType } from "../core/error/error_type.js";
export default base(platform);
