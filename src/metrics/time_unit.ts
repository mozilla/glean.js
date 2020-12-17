/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const TIMEZONE_INFO_PATTERN = "((-|\\+)[0-2]\\d:00)";

/**
 * Different resolutions supported by the time related
 * metric types (e.g. DatetimeMetric).
 */
const enum TimeUnit {
  // Truncate to nanosecond precision.
  Nanosecond = 0,
  // Truncate to microsecond precision.
  Microsecond,
  // Truncate to millisecond precision.
  Millisecond,
  // Truncate to second precision.
  Second,
  // Truncate to minute precision.
  Minute,
  // Truncate to hour precision.
  Hour,
  // Truncate to day precision.
  Day,
}

/**
 * Returns the pattern for a given datetime string. Excluding timezone info.
 *
 * @param unit The time unit for which to get the pattern.
 *
 * @returns The pattern as a string.
 *
 * @throws In case an unknown time unit is passed.
 */
function getTimeUnitDateStringPattern(unit: TimeUnit): string {
  switch (unit) {
  case TimeUnit.Nanosecond:
    // Reference string: 2020-12-17T10:56:43.528000000
    return "(\\d{4}-([0]\\d|1[0-2])-([0-2]\\d|3[0-1])(T(([0-1]\\d)|([0-2][0-3])))(:[0-5]\\d)(:[0-5]\\d)(\\.\\d{9}))";
  case TimeUnit.Microsecond:
    // Reference string: 2020-12-17T10:56:43.528000
    return "(\\d{4}-([0]\\d|1[0-2])-([0-2]\\d|3[0-1])(T(([0-1]\\d)|([0-2][0-3])))(:[0-5]\\d)(:[0-5]\\d)(\\.\\d{6}))";
  case TimeUnit.Millisecond:
    // Reference string: 2020-12-17T10:56:43.528
    return "(\\d{4}-([0]\\d|1[0-2])-([0-2]\\d|3[0-1])(T(([0-1]\\d)|([0-2][0-3])))(:[0-5]\\d)(:[0-5]\\d)(\\.\\d{3}))";
  case TimeUnit.Second:
    // Reference string: 2020-12-17T10:56:43
    return "(\\d{4}-([0]\\d|1[0-2])-([0-2]\\d|3[0-1])(T(([0-1]\\d)|([0-2][0-3])))(:[0-5]\\d)(:[0-5]\\d))";
  case TimeUnit.Minute:
    // Reference string: 2020-12-17T10:56
    return "(\\d{4}-([0]\\d|1[0-2])-([0-2]\\d|3[0-1])(T(([0-1]\\d)|([0-2][0-3])))(:[0-5]\\d))";
  case TimeUnit.Hour:
    // Reference string: 2020-12-17T10
    return "(\\d{4}-([0]\\d|1[0-2])-([0-2]\\d|3[0-1])(T(([0-1]\\d)|([0-2][0-3]))))";
  case TimeUnit.Day:
    // Reference string: 2020-12-17
    return "(\\d{4}-([0]\\d|1[0-2])-([0-2]\\d|3[0-1]))";
  default:
    throw Error(`Unknown time unit ${unit}.`);
  }
}

/**
 * Guesses what is the time unit precision of a possible date string.
 *
 * # Note
 *
 * This function does not validate the date string.
 *
 * @param value The string for which to guess the time unit.
 *
 * @returns The tie unit variant for the precision of the given date.
 *
 * @throws In case the time unit cannot be guesses because this string has an unespected length.
 */
function guessTimeUnitPrecision(value: string): TimeUnit {
  switch(value.length) {
  case 35:
    return TimeUnit.Nanosecond;
  case 32:
    return TimeUnit.Microsecond;
  case 29:
    return TimeUnit.Millisecond;
  case 25:
    return TimeUnit.Second;
  case 22:
    return TimeUnit.Minute;
  case 19:
    return TimeUnit.Hour;
  case 16:
    return TimeUnit.Day;
  default:
    // `value` doesn't have any of the lengths for possible valid date strings.
    throw new Error("`value` is not a valid date string.");
  }
}

/**
 * Build the formatted timezone offset string for the local timezone.
 *
 * The format of the resulting string is `+02:00`.
 *
 * @returns The formatted timezone offset string.
 */
function getFormattedLocalTimezoneOffset(): string {
  const date = new Date();
  const offset = (date.getTimezoneOffset() / 60) * -1;
  const sign = offset > 0 ? "+" : "-";
  const hours = Math.abs(offset)  < 10 ? `0${offset}` : `${offset}`;
  return `${sign}${hours}:00`;
}

/**
 * Return the TimeUnit variant related to a string.
 *
 * The possible string valeus are the ones accepted
 * for the `time_unit` property on Glean's metrics.yaml file:
 * https://mozilla.github.io/glean/book/user/metrics/datetime.html#configuration
 *
 * @param unit A string representing a specific time unit.
 *
 * @returns The TimeUnit variant related to the given string.
 *
 * @throws In case the given string is not in the list of accepted strings.
 */
export function timeUnitFromString(unit: string): TimeUnit {
  switch (unit) {
  case "nanosecond":
    return TimeUnit.Nanosecond;
  case "microsecond":
    return TimeUnit.Microsecond;
  case "millisecond":
    return TimeUnit.Millisecond;
  case "second":
    return TimeUnit.Second;
  case "minute":
    return TimeUnit.Minute;
  case "hour":
    return TimeUnit.Hour;
  case "day":
    return TimeUnit.Day;
  default:
    throw Error(`Unknown time unit string ${unit}.`);
  }
}

/**
 * Build a date string based on a given date object with a given resolution.
 *
 * @param value The date value to make into an ISO string.
 * @param unit The time resolution the resulting string should have.
 *
 * @returns The resulting date string.
 */
export function buildTruncatedDateString(value: Date, unit: TimeUnit): string {
  // The Javascript Date object has millisecond precision,
  // which means nano and micro seconds patterns can't be matched.
  //
  // We will match microsecond and nanosecond with the millisecond pattern
  // and add extra zeroes for micro and nanosecond.
  let capturingGroup;
  if (unit === TimeUnit.Nanosecond || unit === TimeUnit.Microsecond) {
    capturingGroup = new RegExp(getTimeUnitDateStringPattern(TimeUnit.Millisecond));
  } else {
    capturingGroup = new RegExp(getTimeUnitDateStringPattern(unit));
  }

  const fullDateString = value.toISOString();
  const dateStringMatches = fullDateString.match(capturingGroup);
  if (!dateStringMatches) {
    // This would only happen in case the return of `toISOString` changed.
    throw new Error("IMPOSSIBLE: Error parsing generated ISO string from Date object.");
  }

  let truncatedDateString = dateStringMatches[0];
  // Add remaining zeroes in case nano or microseconds.
  if (unit === TimeUnit.Microsecond) {
    truncatedDateString += "000";
  } else if (unit === TimeUnit.Nanosecond) {
    truncatedDateString += "000000";
  }

  // The Javascript Date object does not contain timezone information,
  // it is either UTC or local.
  //
  // We will always default to local.
  const timezoneInfo = getFormattedLocalTimezoneOffset();
  return `${truncatedDateString}${timezoneInfo}`;
}

/**
 * Validates that a given string is a valid date string for any of the possible time units.
 *
 * @param value the string to validate
 *
 * @returns Whether or not the given string is valid.
 */
export function validateDateString(value: string): boolean {
  let timeUnit;
  try {
    timeUnit = guessTimeUnitPrecision(value);
  } catch {
    return false;
  }

  const dateInfoPattern = getTimeUnitDateStringPattern(timeUnit);
  const finalPattern = new RegExp(`^${dateInfoPattern}${TIMEZONE_INFO_PATTERN}$`);
  return finalPattern.test(value);
}

/**
 * Builts a date object from a valid date string.
 *
 * It is expected that the string has already been validated by `validateDateString`
 * before it is given to this function.
 *
 * # Note
 *
 * The Date object is timezone unaware,
 * thus the object created here will be relative to local time.
 *
 * If the string is in a different timezone,
 * the timezone offset will be applied before transforming to an object.
 *
 * @param value The string to transform into a date object.
 *
 * @returns The date object built.
 *
 * @throws If unable to extract the date or timezone information from `value`.
 */
export function dateStringToDateObject(value: string): Date {
  // Extract all the date info up to milliseconds,
  // the Date object in Javascript does not have micro or nanosecond precision.
  const dateStringWithoutTimezone = value.substring(0, value.length - 6);
  const extractedDateInfo = dateStringWithoutTimezone.match(/\d+/g);
  if (!extractedDateInfo) {
    throw new Error("Unable to extract date information from `value`.");
  }
  const dateInfo = {
    year: parseInt(extractedDateInfo[0]),
    month: parseInt(extractedDateInfo[1]) - 1,
    day: parseInt(extractedDateInfo[2]),
    // The `value` does not necessarily have the following information,
    // it will dependend on it's time unit precision.
    hour: parseInt(extractedDateInfo[3] || "0"),
    minute: parseInt(extractedDateInfo[4] || "0"),
    second: parseInt(extractedDateInfo[5] || "0"),
    millisecond: parseInt(extractedDateInfo[6]?.substr(0, 3) || "0")
  };

  // Extract the timezone information off the date string.
  const extractedTimezoneInfo = value.match(new RegExp(`${TIMEZONE_INFO_PATTERN}$`));
  if (!extractedTimezoneInfo) {
    throw new Error("Unable to extract timezone information from `value`.");
  }
  // Calculate the timezone offset in milliseconds.
  const originalTimezoneOffsetMS = parseInt(extractedTimezoneInfo[0].substring(0, 3)) * 60 * 60 * 1000;

  // When you construct a new date like this, it is always in local time.
  const localDate = new Date(
    dateInfo.year,
    dateInfo.month,
    dateInfo.day,
    dateInfo.hour,
    dateInfo.minute,
    dateInfo.second,
    dateInfo.millisecond
  );
  // Get the local timezone offset in milliseconds.
  const localTimezoneOffsetMS = localDate.getTimezoneOffset() * 60 * 1000 * -1;

  // Finally, return the timezone aware date.
  //
  // Note that this date is still in local time,
  // but it is whatever local time was at the time of the original date string.
  return new Date(localDate.getTime() + (localTimezoneOffsetMS - originalTimezoneOffsetMS));
}

export default TimeUnit;
