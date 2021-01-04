/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Different resolutions supported by the time related
 * metric types (e.g. DatetimeMetric).
 */
enum TimeUnit {
  // Truncate to nanosecond precision.
  Nanosecond = "nanosecond",
  // Truncate to microsecond precision.
  Microsecond = "microsecond",
  // Truncate to millisecond precision.
  Millisecond = "millisecond",
  // Truncate to second precision.
  Second = "second",
  // Truncate to minute precision.
  Minute = "minute",
  // Truncate to hour precision.
  Hour = "hour",
  // Truncate to day precision.
  Day = "day",
}

export default TimeUnit;
