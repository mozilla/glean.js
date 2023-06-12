/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// A type that represents a value that can be either a Promise or a value.
// This is used when we are creating interfaces that can be used by either
// the asynchronous or synchronous implementations.
export type OptionalAsync<T> = Promise<T> | T;
