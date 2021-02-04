/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { KNOWN_CLIENT_ID, CLIENT_INFO_STORAGE } from "./constants";
import UUIDMetricType from "metrics/types/uuid";
import DatetimeMetricType from "metrics/types/datetime";
import StringMetricType from "metrics/types/string";
import { createMetric } from "metrics/utils";
import TimeUnit from "metrics/time_unit";
import { Lifetime } from "metrics";
import Glean from "glean";
import PlatformInfo from "platform_info";

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

  async initialize(appBuild?: string, appDisplayVersion?: string): Promise<void> {
    await this.initializeClientId();
    await this.initializeFirstRunDate();
    await this.initializeOs();
    await this.initializeOsVersion();
    await this.initializeArchitecture();
    await this.initializeLocale();
    this.appBuild.set(appBuild || "Unknown");
    this.appDisplayVersion.set(appDisplayVersion || "Unkown");
  }

  /**
   * Generates and sets the client_id if it is not set,
   * or if the current value is currepted.
   */
  private async initializeClientId(): Promise<void> {
    let needNewClientId = false;
    const clientIdData = await Glean.metricsDatabase.getMetric(CLIENT_INFO_STORAGE, this.clientId);
    if (clientIdData) {
      try {
        const currentClientId = createMetric("uuid", clientIdData);
        if (currentClientId.payload() === KNOWN_CLIENT_ID) {
          needNewClientId = true;
        }
      } catch {
        console.warn("Unexpected value found for Glean clientId. Ignoring.");
        needNewClientId = true;
      }
    } else {
      needNewClientId = true;
    }

    if (needNewClientId) {
      this.clientId.generateAndSet();
    }
  }

  /**
   * Generates and sets the first_run_date if it is not set.
   */
  private async initializeFirstRunDate(): Promise<void> {
    const firstRunDate = await Glean.metricsDatabase.getMetric(
      CLIENT_INFO_STORAGE,
      this.firstRunDate
    );

    if (!firstRunDate) {
      this.firstRunDate.set();
    }
  }

  /**
   * Gets and sets the os.
   */
  async initializeOs(): Promise<void> {
    this.os.set(await PlatformInfo.os());
  }

  /**
   * Gets and sets the os.
   */
  async initializeOsVersion(): Promise<void> {
    this.osVersion.set(await PlatformInfo.osVersion());
  }

  /**
   * Gets and sets the system architecture.
   */
  async initializeArchitecture(): Promise<void> {
    this.architecture.set(await PlatformInfo.arch());
  }

  /**
   * Gets and sets the system / browser locale.
   */
  async initializeLocale(): Promise<void> {
    this.locale.set(await PlatformInfo.locale());
  }
}
