/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The common set of data for creating a new ping.
 */
export default interface CommonPingData {
  // The name of the ping.
  readonly name: string;
  // Whether to include the client ID in the assembled ping when submitting.
  readonly includeClientId: boolean;
  // Whether the ping should be sent empty or not.
  readonly sendIfEmpty: boolean;
  // Optional. The valid reason codes for this ping.
  readonly reasonCodes?: string[];

  // Currently NOT IMPLEMENTED.
  //
  // NOTE: There are specific bugs for implementing each of these features. If
  // these features are implemented later, please move the property out of the
  // "NOT IMPLEMENTED" section and remove the bug.

  // https://bugzilla.mozilla.org/show_bug.cgi?id=1895297
  readonly preciseTimestamps?: boolean;

  // https://bugzilla.mozilla.org/show_bug.cgi?id=1895299
  readonly includeInfoSections?: boolean;

  // https://bugzilla.mozilla.org/show_bug.cgi?id=1895300
  readonly enabled?: boolean;

  // https://bugzilla.mozilla.org/show_bug.cgi?id=1895302
  readonly schedulesPings?: string[];
}
