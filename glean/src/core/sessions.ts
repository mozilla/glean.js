/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Check if the current session has been inactive for over thirty minutes. If
 * it has, then we create a new session.
 *
 * @returns {boolean} If the session has been inactive for over thirty minutes.
 */
export function hasSessionBeenInactiveForOverThirtyMinutes(): boolean {
  const lastActive = localStorage.getItem("glean_session_last_active");
  const lastActiveDate = new Date(Number(lastActive));

  // Create a date 30 minutes ago to compare to our lastActiveDate.
  //
  // 60000 - number of milliseconds in a minute
  // 30 - the number of minutes that can pass before a session is inactive
  const thirtyMinutesAgo = new Date(Date.now() - (60000 * 30));

  // If the date we created from 30 minutes ago is more recent than the last
  // active date, then the current session has expired.
  return thirtyMinutesAgo > lastActiveDate;
}
