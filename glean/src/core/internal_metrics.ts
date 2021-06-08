/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { KNOWN_CLIENT_ID, CLIENT_INFO_STORAGE } from "./constants.js";
import UUIDMetricType from "./metrics/types/uuid.js";
import DatetimeMetricType from "./metrics/types/datetime.js";
import StringMetricType from "./metrics/types/string.js";
import { createMetric } from "./metrics/utils.js";
import TimeUnit from "./metrics/time_unit.js";
import { generateUUIDv4 } from "./utils.js";
import type { ConfigurationInterface } from "./config.js";
import type Platform from "../platform/index.js";
import type MetricsDatabase from "./metrics/database.js";
import { Lifetime } from "./metrics/lifetime.js";
import log, { LoggingLevel } from "./log.js";

const LOG_TAG = "core.InternalMetrics";

/**
 * Glean internal metrics.
 *
 * Metrics initialized here should be defined in `./metrics.yaml`
 * and manually translated into JS code.
 */
export class CoreMetrics {
  readonly clientId: UUIDMetricType;
  readonly firstRunDate: DatetimeMetricType;
  readonly os: StringMetricType;
  readonly osVersion: StringMetricType;
  readonly architecture: StringMetricType;
  readonly locale: StringMetricType;
  // Provided by the user
  readonly appBuild: StringMetricType;
  readonly appDisplayVersion: StringMetricType;

  constructor() {
    this.clientId = new UUIDMetricType({
      name: "client_id",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.User,
      disabled: false,
    });

    this.firstRunDate = new DatetimeMetricType({
      name: "first_run_date",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.User,
      disabled: false,
    }, TimeUnit.Day);

    this.os = new StringMetricType({
      name: "os",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false,
    });

    this.osVersion = new StringMetricType({
      name: "os_version",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false,
    });

    this.architecture = new StringMetricType({
      name: "architecture",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false,
    });

    this.locale = new StringMetricType({
      name: "locale",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false,
    });

    this.appBuild = new StringMetricType({
      name: "app_build",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false,
    });

    this.appDisplayVersion = new StringMetricType({
      name: "app_display_version",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false,
    });
  }

  async initialize(config: ConfigurationInterface, platform: Platform, metricsDatabase: MetricsDatabase): Promise<void> {
    await this.initializeClientId(metricsDatabase);
    await this.initializeFirstRunDate(metricsDatabase);
    await StringMetricType._private_setUndispatched(this.os, await platform.info.os());
    await StringMetricType._private_setUndispatched(this.osVersion, await platform.info.osVersion());
    await StringMetricType._private_setUndispatched(this.architecture, await platform.info.arch());
    await StringMetricType._private_setUndispatched(this.locale, await platform.info.locale());
    await StringMetricType._private_setUndispatched(this.appBuild, config.appBuild || "Unknown");
    await StringMetricType._private_setUndispatched(this.appDisplayVersion, config.appDisplayVersion || "Unknown");
  }

  /**
   * Generates and sets the client_id if it is not set,
   * or if the current value is currepted.
   *
   * @param metricsDatabase The metrics database.
   */
  private async initializeClientId(metricsDatabase: MetricsDatabase): Promise<void> {
    let needNewClientId = false;
    const clientIdData = await metricsDatabase.getMetric(CLIENT_INFO_STORAGE, this.clientId);
    if (clientIdData) {
      try {
        const currentClientId = createMetric("uuid", clientIdData);
        if (currentClientId.payload() === KNOWN_CLIENT_ID) {
          needNewClientId = true;
        }
      } catch {
        log(LOG_TAG, "Unexpected value found for Glean clientId. Ignoring.", LoggingLevel.Warn);
        needNewClientId = true;
      }
    } else {
      needNewClientId = true;
    }

    if (needNewClientId) {
      await UUIDMetricType._private_setUndispatched(this.clientId, generateUUIDv4());
    }
  }

  /**
   * Generates and sets the first_run_date if it is not set.
   *
   * @param metricsDatabase The metrics database.
   */
  private async initializeFirstRunDate(metricsDatabase: MetricsDatabase): Promise<void> {
    const firstRunDate = await metricsDatabase.getMetric(
      CLIENT_INFO_STORAGE,
      this.firstRunDate
    );

    if (!firstRunDate) {
      await DatetimeMetricType._private_setUndispatched(this.firstRunDate);
    }
  }
}
