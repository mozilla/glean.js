export var LoggingLevel;
(function (LoggingLevel) {
    LoggingLevel["Debug"] = "debug";
    LoggingLevel["Info"] = "info";
    LoggingLevel["Warn"] = "warn";
    LoggingLevel["Error"] = "error";
    LoggingLevel["Trace"] = "trace";
})(LoggingLevel || (LoggingLevel = {}));
export default function log(modulePath, message, level = LoggingLevel.Debug) {
    const prefix = `(Glean.${modulePath})`;
    if (Array.isArray(message)) {
        console[level](prefix, ...message);
    }
    else {
        console[level](prefix, message);
    }
}
