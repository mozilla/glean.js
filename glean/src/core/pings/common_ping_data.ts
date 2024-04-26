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
  readonly preciseTimestamps?: boolean;
  readonly includeInfoSections?: boolean;
  readonly enabled?: boolean;
  readonly schedulesPings?: string[];
}
