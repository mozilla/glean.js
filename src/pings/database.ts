/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Metrics as MetricsPayload } from "metrics/database";
import { Store } from "storage";
import PersistentStore from "storage/persistent";
import { JSONObject } from "utils";

export interface PingInfo extends JSONObject {
  seq: number,
  start_time: string,
  end_time: string,
  reason?: string,
}

export interface ClientInfo extends JSONObject {
  client_id?: string,
  locale?: string,
  device_model?: string,
  device_manufacturer?: string,
  app_channel?: string,
  // Even though all the next fields are required by the schema
  // we can't guarantee that they will be present.
  // Active discussion about this is happening on Bug 1685705.
  app_build?: string,
  app_display_version?: string,
  architecture?: string,
  first_run_date?: string,
  os?: string,
  os_version?: string,
  telemetry_sdk_build: string
}

/**
 * This definition must be in sync with
 * the Glean ping [schema](https://github.com/mozilla-services/mozilla-pipeline-schemas/blob/master/schemas/glean/glean/glean.1.schema.json)
 */
export interface PingPayload extends JSONObject {
  ping_info: PingInfo,
  client_info: ClientInfo,
  metrics?: MetricsPayload,
  events?: JSONObject,
}

/**
 * Debug headers to be added to a ping.
 */
export interface PingHeaders extends JSONObject {
  "X-Debug-Id"?: string,
  "X-Source-Tags"?: string,
}


/**
 * The pings database is an abstraction layer on top of the underlying storage.
 *
 * Ping data is saved to the database in the following format:
 *
 * {
 *  "<identifier>": {
 *    "path": string,
 *    "payload": PingPayload,
 *    "headers": PingHeaders,
 *  }
 * }
 */
class PingsDatabase {
  private store: Store;

  constructor() {
    this.store = new PersistentStore("pings");
  }

  /**
   * Records a new ping to the ping database.
   *
   * @param path The path where this ping must be submitted to.
   * @param identifier The identifier under which to store the ping.
   * @param payload The payload of the ping to record.
   * @param headers Optional headers to include on the final ping request.
   */
  async recordPing(
    path: string,
    identifier: string,
    payload: PingPayload,
    headers?: PingHeaders
  ): Promise<void> {
    await this.store.update([identifier], () => {
      const base = {
        path,
        payload
      };
      return headers ? { ...base, headers } : base;
    });
  }

  /**
   * Clears all the pings from the database.
   */
  async clearAll(): Promise<void> {
    await this.store.delete([]);
  }
}

export default PingsDatabase;
