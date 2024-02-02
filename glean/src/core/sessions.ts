/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Check if the current session is inactive - the default timeout is 30 minutes.
 *
 * @param sessionLengthInMinutes Length of the session in minutes - defaults to 30.
 * @returns {boolean} If the current session is inactive.
 */
export function isSessionInactive(sessionLengthInMinutes = 30): boolean {
  const lastActive = localStorage.getItem("glean_session_last_active");
  const lastActiveDate = new Date(Number(lastActive));

  // Subtract the session length from the current date
  const inactiveThreshold = new Date(Date.now() - (60000 * sessionLengthInMinutes));

  // If the inactiveThreshold is more recent than the lastActiveDate, then the
  // current session is expired.
  return inactiveThreshold > lastActiveDate;
}
