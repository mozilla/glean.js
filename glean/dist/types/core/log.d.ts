export declare enum LoggingLevel {
    Debug = "debug",
    Info = "info",
    Warn = "warn",
    Error = "error",
    Trace = "trace"
}
/**
 * Logs a message to the console, tagging it as a message that is coming from Glean.
 *
 * # Important
 *
 * The message is always logged on the `debug` level.
 *
 * @param modulePath The path to the entity which logging this message.
 *        This should be a dotted camel case string, so spaces. Note that whatever path is
 *        given here will be prefixed with `Glean.`.
 * @param message The message to log.
 * @param level The level in which to log this message, default is LoggingLevel.Debug.
 */
export default function log(modulePath: string, message: unknown | unknown[], level?: LoggingLevel): void;
