/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Context } from "../context.js";
import EventsDatabase from "../metrics/events_database/index.js";

/**
 * Test-only API
 *
 * Fakes a restart by creating a new instance of the events database which will
 * log a `glean.restarted` event.
 *
 * If you do not move the clock forward, an error will be logged.
 *
 * @param timeOffset How far ahead to move clock before restarting. Some events just need
 *        a future time, others need a specific future time. The default time is 1 minute.
 * @returns New instance of `EventsDatabase` since we "restarted" it.
 */
export function testRestartGlean(timeOffset: number = 1000 * 60): EventsDatabase {
  // Move the clock to look like Glean was really restarted.
  Context.startTime.setTime(Context.startTime.getTime() + timeOffset);

  // Fake a restart.
  const db = new EventsDatabase();
  db.initialize();
  return db;
}
