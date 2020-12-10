/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Persistent storage implementation is platform dependent.
// Each platform will have a different build
// which will alias `storage/persistent` to the correct impl.
//
// We leave this index.ts file as a fallback for tests.
import WeakStore from "storage/weak";
export default WeakStore;
