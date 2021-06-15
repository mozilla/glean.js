/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This file is a drop in replacement for `fflate` in QML.
 * This library raises errors in QML. https://github.com/101arrowz/fflate/issues/71
 * could be the the culprit, but it is unclear at this point.
 */

// eslint-disable-next-line jsdoc/require-jsdoc
export function gzipSync() {
  // We throw here because when the gzipping action throws the ping upload manager will
  // catch and send the uncompressed ping, which is what we want on QML for the time being.
  // We are trying to figure out how to actually add the gzipping step to QML on Bug 1716322.
  throw new Error("Attempted to use `gzipSync` from QML, but that is not supported.");
}
