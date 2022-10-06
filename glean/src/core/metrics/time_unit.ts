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

/**
 * Converts a number from any `TimeUnit` to nanoseconds.
 *
 * @param duration Difference between start and stop time stamps.
 * @param timeUnit Time unit for the duration.
 * @returns Duration converted to nanoseconds.
 */
export function convertTimeUnitToNanos(duration: number, timeUnit: TimeUnit): number {
  switch (timeUnit) {
  case TimeUnit.Nanosecond:
    return duration;
  case TimeUnit.Microsecond:
    return duration * 10 ** 3;
  case TimeUnit.Millisecond:
    return duration * 10 ** 6;
  case TimeUnit.Second:
    return duration * 10 ** 9;
  case TimeUnit.Minute:
    return duration * 10 ** 9 * 60;
  case TimeUnit.Hour:
    return duration * 10 ** 9 * 60 * 60;
  case TimeUnit.Day:
    return duration * 10 ** 9 * 60 * 60 * 24;
  }
}

export default TimeUnit;
