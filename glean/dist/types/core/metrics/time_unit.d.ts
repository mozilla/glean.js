/**
 * Different resolutions supported by the time related
 * metric types (e.g. DatetimeMetric).
 */
declare enum TimeUnit {
    Nanosecond = "nanosecond",
    Microsecond = "microsecond",
    Millisecond = "millisecond",
    Second = "second",
    Minute = "minute",
    Hour = "hour",
    Day = "day"
}
/**
 * Converts a number from any `TimeUnit` to nanoseconds.
 *
 * @param duration Difference between start and stop time stamps.
 * @param timeUnit Time unit for the duration.
 * @returns Duration converted to nanoseconds.
 */
export declare function convertTimeUnitToNanos(duration: number, timeUnit: TimeUnit): number;
export default TimeUnit;
