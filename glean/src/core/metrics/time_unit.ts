/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Different resolutions supported by the time related
 * metric types (e.g. DatetimeMetric).
 */
enum TimeUnit {
  // Represents nanosecond precision.
  Nanosecond = "nanosecond",
  // Represents microsecond precision.
  Microsecond = "microsecond",
  // Represents millisecond precision.
  Millisecond = "millisecond",
  // Represents second precision.
  Second = "second",
  // Represents minute precision.
  Minute = "minute",
  // Represents hour precision.
  Hour = "hour",
  // Represents day precision.
  Day = "day",
}

export default TimeUnit;
