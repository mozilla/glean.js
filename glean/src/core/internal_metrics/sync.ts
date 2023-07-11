/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type PlatformSync from "../../platform/sync.js";
import type MetricsDatabaseSync from "../metrics/database/sync.js";

import { KNOWN_CLIENT_ID, CLIENT_INFO_STORAGE } from "../constants.js";
import { InternalUUIDMetricType as UUIDMetricType } from "../metrics/types/uuid.js";
import { InternalDatetimeMetricType as DatetimeMetricType } from "../metrics/types/datetime.js";
import { InternalStringMetricType as StringMetricType } from "../metrics/types/string.js";
import { createMetric } from "../metrics/utils.js";
import TimeUnit from "../metrics/time_unit.js";
import { generateUUIDv4 } from "../utils.js";
import { Lifetime } from "../metrics/lifetime.js";
import log, { LoggingLevel } from "../log.js";
import { Context } from "../context.js";

const LOG_TAG = "core.InternalMetrics";

/**
 * Glean internal metrics.
 *
 * Metrics initialized here should be defined in `./metrics.yaml`
 * and manually translated into JS code.
 */
export class CoreMetricsSync {
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
  readonly buildDate: DatetimeMetricType;

  constructor() {
    this.clientId = new UUIDMetricType({
      name: "client_id",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.User,
      disabled: false
    });

    this.firstRunDate = new DatetimeMetricType(
      {
        name: "first_run_date",
        category: "",
        sendInPings: ["glean_client_info"],
        lifetime: Lifetime.User,
        disabled: false
      },
      TimeUnit.Day
    );

    this.os = new StringMetricType({
      name: "os",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false
    });

    this.osVersion = new StringMetricType({
      name: "os_version",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false
    });

    this.architecture = new StringMetricType({
      name: "architecture",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false
    });

    this.locale = new StringMetricType({
      name: "locale",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false
    });

    this.appChannel = new StringMetricType({
      name: "app_channel",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false
    });

    this.appBuild = new StringMetricType({
      name: "app_build",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false
    });

    this.appDisplayVersion = new StringMetricType({
      name: "app_display_version",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.Application,
      disabled: false
    });

    this.buildDate = new DatetimeMetricType(
      {
        name: "build_date",
        category: "",
        sendInPings: ["glean_client_info"],
        lifetime: Lifetime.Application,
        disabled: false
      },
      "second"
    );
  }

  initialize(): void {
    // If the client had used previous versions of Glean.js before we moved
    // to LocalStorage as the data store, then we need to move important
    // user data from IndexedDB to LocalStorage.
    //
    // Currently we are interested in migrating two things
    // 1. The client_id - consistent clientId across all sessions.
    // 2. The first_run_date - the date when the client was first run.

    // The migration is done only once per client. The flag is set in
    // LocalStorage to indicate that the migration has been completed.
    const migrationFlag = localStorage.getItem("GLEAN_MIGRATION_FLAG");
    if (migrationFlag !== "1") {
      this.migrateCoreMetricsFromIdb();
      localStorage.setItem("GLEAN_MIGRATION_FLAG", "1");
    } else {
      // If we do not need to migrate anything, then we can set the metrics
      // for the first time.
      this.initializeUserLifetimeMetrics();
    }

    this.os.set((Context.platform as PlatformSync).info.os());
    this.osVersion.set((Context.platform as PlatformSync).info.osVersion(Context.config.osVersion));
    this.architecture.set(
      (Context.platform as PlatformSync).info.arch(Context.config.architecture)
    );
    this.locale.set((Context.platform as PlatformSync).info.locale());
    this.appBuild.set(Context.config.appBuild || "Unknown");
    this.appDisplayVersion.set(Context.config.appDisplayVersion || "Unknown");
    if (Context.config.channel) {
      this.appChannel.set(Context.config.channel);
    }
    if (Context.config.buildDate) {
      this.buildDate.set();
    }
  }

  /**
   * Generates and sets the client_id if it is not set,
   * or if the current value is corrupted.
   */
  private initializeClientId(): void {
    let needNewClientId = false;
    const clientIdData = (Context.metricsDatabase as MetricsDatabaseSync).getMetric(
      CLIENT_INFO_STORAGE,
      this.clientId
    );
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
      this.clientId.set(generateUUIDv4());
    }
  }

  /**
   * Generates and sets the first_run_date if it is not set.
   */
  private initializeFirstRunDate(): void {
    const firstRunDate = (Context.metricsDatabase as MetricsDatabaseSync).getMetric(
      CLIENT_INFO_STORAGE,
      this.firstRunDate
    );

    if (!firstRunDate) {
      this.firstRunDate.set();
    }
  }

  /**
   * Initializes the Glean internal user-lifetime metrics.
   */
  private initializeUserLifetimeMetrics(): void {
    this.initializeClientId();
    this.initializeFirstRunDate();
  }

  /**
   * Migrates the core metrics from the old IDB storage to LocalStorage
   * on first launch IF the client had used previous versions of Glean.js -
   * pre LocalStorage.
   *
   * There is no way to access IDB data synchronously, so we rely on listeners
   * for when specific actions complete. This means that we need to be careful
   * and ensure that the clientId and firstRunDate are always set.
   *
   * Once the migration is complete, running the initialize functions for the
   * clientId and firstRunDate equate to no-ops. If there is an error anywhere
   * along the way and the migration is not complete, then the initialize the
   * two metrics as usual.
   */
  private migrateCoreMetricsFromIdb(): void {
    const dbRequest = window.indexedDB.open("Glean");
    dbRequest.onerror = () => {
      this.initializeUserLifetimeMetrics();
    };

    dbRequest.onsuccess = () => {
      try {
        const db = dbRequest.result;
        const transaction = db?.transaction("Main", "readwrite");
        const store = transaction.objectStore("Main");

        // All the core metrics are stored in the userLifetimeMetrics object.
        const req = store.get("userLifetimeMetrics");
        req.onsuccess = () => {
          // Pull and set the existing clientId.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const clientId = req.result?.["glean_client_info"]?.["uuid"]?.["client_id"] as string;
          if (!!clientId) {
            this.clientId.set(clientId);
          } else {
            this.initializeClientId();
          }

          // Pull and set the existing firstRunDate.
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const firstRunDate = req.result?.["glean_client_info"]?.["datetime"]?.[
            "first_run_date"
          ] as {
            date: string;
            timezone: number;
            timeUnit: TimeUnit;
          };
          if (!!firstRunDate) {
            this.firstRunDate.setSyncRaw(
              firstRunDate.date,
              firstRunDate.timezone,
              firstRunDate.timeUnit
            );
          } else {
            this.initializeFirstRunDate();
          }
        };

        req.onerror = () => {
          this.initializeUserLifetimeMetrics();
        };
      } catch (e) {
        // Fail-safe in case any generic error occurs.
        this.initializeUserLifetimeMetrics();
      }
    };
  }
}
