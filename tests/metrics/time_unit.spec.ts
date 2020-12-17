/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import assert from "assert";
import sinon from "sinon";

import TimeUnit, { timeUnitFromString, buildTruncatedDateString, validateDateString, dateStringToDateObject } from "metrics/time_unit";

const sandbox = sinon.createSandbox();

describe("TimeUnit", function() {
  afterEach(function () {
    sandbox.restore();
  });

  it("returns correct time unit from time unit string", function() {
    assert.strictEqual(timeUnitFromString("nanosecond"), TimeUnit.Nanosecond);
    assert.strictEqual(timeUnitFromString("microsecond"), TimeUnit.Microsecond);
    assert.strictEqual(timeUnitFromString("millisecond"), TimeUnit.Millisecond);
    assert.strictEqual(timeUnitFromString("second"), TimeUnit.Second);
    assert.strictEqual(timeUnitFromString("minute"), TimeUnit.Minute);
    assert.strictEqual(timeUnitFromString("hour"), TimeUnit.Hour);
    assert.strictEqual(timeUnitFromString("day"), TimeUnit.Day);
  });

  it("correctly builds truncated date string", function() {
    // Monkeypatch Date functions to have a deterministic return value anywhere in the world.
    sandbox.stub(Date.prototype, "getTimezoneOffset").callsFake(() => -300);
    sandbox.stub(Date.prototype, "toISOString").callsFake(() => "1995-05-25T06:15:45.385Z");

    const testDate = new Date(1995, 4, 25, 8, 15, 45, 385);
    assert.strictEqual(buildTruncatedDateString(testDate, TimeUnit.Nanosecond), "1995-05-25T06:15:45.385000000+05:00");
    assert.strictEqual(buildTruncatedDateString(testDate, TimeUnit.Microsecond), "1995-05-25T06:15:45.385000+05:00");
    assert.strictEqual(buildTruncatedDateString(testDate, TimeUnit.Millisecond), "1995-05-25T06:15:45.385+05:00");
    assert.strictEqual(buildTruncatedDateString(testDate, TimeUnit.Second), "1995-05-25T06:15:45+05:00");
    assert.strictEqual(buildTruncatedDateString(testDate, TimeUnit.Minute), "1995-05-25T06:15+05:00");
    assert.strictEqual(buildTruncatedDateString(testDate, TimeUnit.Hour), "1995-05-25T06+05:00");
    assert.strictEqual(buildTruncatedDateString(testDate, TimeUnit.Day), "1995-05-25+05:00");
  });

  it("correctly validates date string", function() {
    // Invalids
    assert.strictEqual(validateDateString(""), false);
    assert.strictEqual(validateDateString("1234567890".repeat(20)), false);
    assert.strictEqual(validateDateString("a".repeat(35)), false);
    assert.strictEqual(validateDateString("1995-05-25T06+05:00aaa"), false);
    assert.strictEqual(validateDateString("25-05-2020+05:00"), false);
    assert.strictEqual(validateDateString("2020-05-32+05:00"), false);
    assert.strictEqual(validateDateString("2020-05-32"), false);
    assert.strictEqual(validateDateString("2020-13-31+05:00"), false);
    assert.strictEqual(validateDateString("2020-13-3113:45:15+05:00"), false);
    assert.strictEqual(validateDateString("2020-13-31T24:45:15+05:00"), false);
    assert.strictEqual(validateDateString("2020-13-31T13:62:15+05:00"), false);
    assert.strictEqual(validateDateString("2020-13-31T13:45:15"), false);
    assert.strictEqual(validateDateString("2020-13-31T13:45:77+05:00"), false);
    assert.strictEqual(validateDateString("2020-13-31T13:45:77+25:00"), false);
    assert.strictEqual(validateDateString("2020-13-31T13:45:77+05:15"), false);
    assert.strictEqual(validateDateString("2020-13-31T13:45:15"), false);

    // Valids
    assert.strictEqual(validateDateString("1995-05-25T06:15:45.385000000+05:00"), true);
    assert.strictEqual(validateDateString("1995-05-25T06:15:45.385000+05:00"), true);
    assert.strictEqual(validateDateString("1995-05-25T06:15:45.385+05:00"), true);
    assert.strictEqual(validateDateString("1995-05-25T06:15:45+05:00"), true);
    assert.strictEqual(validateDateString("1995-05-25T06:15+05:00"), true);
    assert.strictEqual(validateDateString("1995-05-25T06+05:00"), true);
    assert.strictEqual(validateDateString("1995-05-25+05:00"), true);
  });

  it("correctly transforms a date string into a Date object", function() {
    // Monkeypatch Date functions to have a deterministic return value anywhere in the world.
    sandbox.stub(Date.prototype, "getTimezoneOffset").callsFake(() => -300);

    const resultSameTimezone = dateStringToDateObject("1995-05-25T06:15:45.385000000+05:00");
    assert.strictEqual(resultSameTimezone.getFullYear(), 1995);
    assert.strictEqual(resultSameTimezone.getMonth(), 4);
    assert.strictEqual(resultSameTimezone.getDate(), 25);
    assert.strictEqual(resultSameTimezone.getHours(), 6);
    assert.strictEqual(resultSameTimezone.getMinutes(), 15);
    assert.strictEqual(resultSameTimezone.getSeconds(), 45);
    assert.strictEqual(resultSameTimezone.getMilliseconds(), 385);

    const resultHoursResolution = dateStringToDateObject("1995-05-25+05:00");
    assert.strictEqual(resultHoursResolution.getFullYear(), 1995);
    assert.strictEqual(resultHoursResolution.getMonth(), 4);
    assert.strictEqual(resultHoursResolution.getDate(), 25);
    assert.strictEqual(resultHoursResolution.getHours(), 0);
    assert.strictEqual(resultHoursResolution.getMinutes(), 0);
    assert.strictEqual(resultHoursResolution.getSeconds(), 0);
    assert.strictEqual(resultHoursResolution.getMilliseconds(), 0);

    const resultUTC = dateStringToDateObject("1995-05-25T06:15:45.385000000+00:00");
    assert.strictEqual(resultUTC.getFullYear(), 1995);
    assert.strictEqual(resultUTC.getMonth(), 4);
    assert.strictEqual(resultUTC.getDate(), 25);
    assert.strictEqual(resultUTC.getHours(), 11);
    assert.strictEqual(resultUTC.getMinutes(), 15);
    assert.strictEqual(resultUTC.getSeconds(), 45);
    assert.strictEqual(resultUTC.getMilliseconds(), 385);

    const resultBigTimezoneDiff = dateStringToDateObject("1995-05-25T18:15:45.385000000-09:00");
    assert.strictEqual(resultBigTimezoneDiff.getFullYear(), 1995);
    assert.strictEqual(resultBigTimezoneDiff.getMonth(), 4);
    assert.strictEqual(resultBigTimezoneDiff.getDate(), 26);
    assert.strictEqual(resultBigTimezoneDiff.getHours(), 8);
    assert.strictEqual(resultBigTimezoneDiff.getMinutes(), 15);
    assert.strictEqual(resultBigTimezoneDiff.getSeconds(), 45);
    assert.strictEqual(resultBigTimezoneDiff.getMilliseconds(), 385);
  });
});
