/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { KNOWN_CLIENT_ID, CLIENT_INFO_STORAGE } from "./constants.js";
import { InternalUUIDMetricType as UUIDMetricType } from "./metrics/types/uuid.js";
import { InternalDatetimeMetricType as DatetimeMetricType } from "./metrics/types/datetime.js";
import { InternalStringMetricType as StringMetricType } from "./metrics/types/string.js";
import { createMetric } from "./metrics/utils.js";
import TimeUnit from "./metrics/time_unit.js";
import { generateUUIDv4 } from "./utils.js";
import { Lifetime } from "./metrics/lifetime.js";
import log, { LoggingLevel } from "./log.js";
import { Context } from "./context.js";

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
  readonly appChannel: StringMetricType;
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

    this.appChannel = new StringMetricType({
      name: "app_channel",
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

  async initialize(): Promise<void> {
    await this.initializeClientId();
    await this.initializeFirstRunDate();
    await StringMetricType._private_setUndispatched(this.os, await Context.platform.info.os());
    await StringMetricType._private_setUndispatched(this.osVersion, await Context.platform.info.osVersion(Context.config.osVersion));
    await StringMetricType._private_setUndispatched(this.architecture, await Context.platform.info.arch(Context.config.architecture));
    await StringMetricType._private_setUndispatched(this.locale, await Context.platform.info.locale());
    await StringMetricType._private_setUndispatched(this.appBuild, Context.config.appBuild || "Unknown");
    await StringMetricType._private_setUndispatched(this.appDisplayVersion, Context.config.appDisplayVersion || "Unknown");
    if (Context.config.channel) {
      await StringMetricType._private_setUndispatched(this.appChannel, Context.config.channel);
    }
  }

  /**
   * Generates and sets the client_id if it is not set,
   * or if the current value is currepted.
   */
  private async initializeClientId(): Promise<void> {
    let needNewClientId = false;
    const clientIdData = await Context.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, this.clientId);
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
   */
  private async initializeFirstRunDate(): Promise<void> {
    const firstRunDate = await Context.metricsDatabase.getMetric(
      CLIENT_INFO_STORAGE,
      this.firstRunDate
    );

    if (!firstRunDate) {
      await DatetimeMetricType._private_setUndispatched(this.firstRunDate);
    }
  }
}
