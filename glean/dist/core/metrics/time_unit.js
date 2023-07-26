var TimeUnit;
(function (TimeUnit) {
    TimeUnit["Nanosecond"] = "nanosecond";
    TimeUnit["Microsecond"] = "microsecond";
    TimeUnit["Millisecond"] = "millisecond";
    TimeUnit["Second"] = "second";
    TimeUnit["Minute"] = "minute";
    TimeUnit["Hour"] = "hour";
    TimeUnit["Day"] = "day";
})(TimeUnit || (TimeUnit = {}));
export function convertTimeUnitToNanos(duration, timeUnit) {
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
