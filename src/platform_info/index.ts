/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Must be up to date with https://github.com/mozilla/glean/blob/main/glean-core/src/system.rs
export const enum KnownOperatingSystems {
  Android = "Android",
  iOS = "iOS",
  Linux = "Linux",
  MacOS = "Darwin",
  Windows = "Windows",
  FreeBSD = "FreeBSD",
  NetBSD = "NetBSD",
  OpenBSD = "OpenBSD",
  Solaris = "Solaris",
  // ChromeOS is not listed in the Glean SDK because it is not a possibility there.
  ChromeOS = "ChromeOS",
  Unknown = "Unknown",
}

export interface PlatformInfo {
  /**
   * Gets and returns the current OS system.
   *
   * @returns The current OS.
   */
  os(): Promise<KnownOperatingSystems>;

  /**
   * Gets and returns the current OS system version.
   *
   * @returns The current OS version.
   */
  osVersion(): Promise<string>;

  /**
   * Gets and returnst the current system architecture.
   *
   * @returns The current system architecture.
   */
  arch(): Promise<string>;

  /**
   * Gets and returnst the current system / browser locale.
   *
   * @returns The current system / browser locale.
   */
  locale(): Promise<string>;
}

// Default export for tests sake.
const MockPlatformInfo: PlatformInfo = {
  os(): Promise<KnownOperatingSystems> {
    return Promise.resolve(KnownOperatingSystems.Unknown);
  },

  osVersion(): Promise<string> {
    return Promise.resolve("Unknown");
  },

  arch(): Promise<string> {
    return Promise.resolve("Unknown");
  },

  locale(): Promise<string> {
    return Promise.resolve("Unknown");
  },
};
export default MockPlatformInfo;
