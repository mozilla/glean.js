import type { Metrics } from "../metrics/index.js";
import type { JSONObject, JSONArray } from "../utils.js";
export interface PingInfo extends JSONObject {
    seq: number;
    start_time: string;
    end_time: string;
    reason?: string;
}
export interface ClientInfo extends JSONObject {
    client_id?: string;
    locale?: string;
    device_model?: string;
    device_manufacturer?: string;
    app_channel?: string;
    app_build?: string;
    app_display_version?: string;
    architecture?: string;
    first_run_date?: string;
    os?: string;
    os_version?: string;
    telemetry_sdk_build: string;
}
/**
 * This definition must be in sync with
 * the Glean ping [schema](https://github.com/mozilla-services/mozilla-pipeline-schemas/blob/master/schemas/glean/glean/glean.1.schema.json)
 */
export interface PingPayload extends JSONObject {
    ping_info: PingInfo;
    client_info: ClientInfo;
    metrics?: Metrics;
    events?: JSONArray;
}
