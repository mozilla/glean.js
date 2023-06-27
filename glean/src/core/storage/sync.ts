/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSONValue } from "../utils";
import type { IStore, StorageIndex } from "./shared";

// See `IStore` for method documentation.
export default interface SynchronousStore extends IStore {
  get(index?: StorageIndex): JSONValue | undefined;
  update(index: StorageIndex, transformFn: (v?: JSONValue) => JSONValue): void;
  delete(index: StorageIndex): void;
}
