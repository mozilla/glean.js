export const GLEAN_SCHEMA_VERSION = 1;
export const GLEAN_VERSION = "2.0.0-alpha.1";
export const PING_INFO_STORAGE = "glean_ping_info";
export const CLIENT_INFO_STORAGE = "glean_client_info";
export const KNOWN_CLIENT_ID = "c0ffeec0-ffee-c0ff-eec0-ffeec0ffeec0";
export const DEFAULT_TELEMETRY_ENDPOINT = "https://incoming.telemetry.mozilla.org";
export const DELETION_REQUEST_PING_NAME = "deletion-request";
export const EVENTS_PING_NAME = "events";
export const GLEAN_MAX_SOURCE_TAGS = 5;
export const GLEAN_REFERENCE_TIME_EXTRA_KEY = "#glean_reference_time";
export const GLEAN_EXECUTION_COUNTER_EXTRA_KEY = "#glean_execution_counter";
export const GLEAN_RESERVED_EXTRA_KEYS = [
    GLEAN_EXECUTION_COUNTER_EXTRA_KEY,
    GLEAN_REFERENCE_TIME_EXTRA_KEY
];
