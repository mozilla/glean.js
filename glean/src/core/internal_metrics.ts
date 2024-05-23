/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { KNOWN_CLIENT_ID, CLIENT_INFO_STORAGE } from "./constants.js";
import { InternalUUIDMetricType as UUIDMetricType } from "./metrics/types/uuid.js";
import { InternalDatetimeMetricType as DatetimeMetricType } from "./metrics/types/datetime.js";
import { InternalStringMetricType as StringMetricType } from "./metrics/types/string.js";
import { InternalCounterMetricType as CounterMetricType } from "./metrics/types/counter.js";
import { createMetric } from "./metrics/utils.js";
import TimeUnit from "./metrics/time_unit.js";
import { generateUUIDv4, isWindowObjectUnavailable } from "./utils.js";
import { Lifetime } from "./metrics/lifetime.js";
import log, { LoggingLevel } from "./log.js";
import { Context } from "./context.js";
import { isSessionInactive } from "./sessions.js";

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
  readonly sessionId: UUIDMetricType;
  readonly sessionCount: CounterMetricType;
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

    this.sessionId = new UUIDMetricType({
      name: "session_id",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.User,
      disabled: false
    });

    this.sessionCount = new CounterMetricType({
      name: "session_count",
      category: "",
      sendInPings: ["glean_client_info"],
      lifetime: Lifetime.User,
      disabled: false
    });
  }

  initialize(): void {
    if (!Context.testing && isWindowObjectUnavailable()) {
      return;
    }

    this.initializeClientId();
    this.initializeFirstRunDate();

    this.updateSessionInfo();

    this.os.set(Context.platform.info.os());
    this.osVersion.set(Context.platform.info.osVersion());
    this.architecture.set(Context.platform.info.arch());
    this.locale.set(Context.platform.info.locale());
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
   * Update local stored session information for Glean. This is called whenever
   * the app on initialization and just after every read/write/delete to/from
   * storage.
   *
   * There are a few scenarios to handle depending on what we already have
   * stored about the session and how long it has been since the last action.
   *
   * SCENARIOS:
   *
   * 1. If this is the first session (there is no existing session ID),
   * then we set a new session ID and a lastActive timestamp.
   *
   * 2. If the session is not expired, then we only update the lastActive time.
   *
   * 3. If the session is expired (inactive threshold is more recent than lastActive)
   * then we update the session ID, the session sequence number, and the lastActive time.
   */
  updateSessionInfo(): void {
    if (isWindowObjectUnavailable()) {
      return;
    }

    const existingSessionId = Context.metricsDatabase.getMetric(
      CLIENT_INFO_STORAGE,
      this.sessionId
    );

    if (existingSessionId) {
      try {
        // If the session has timed out, then we create a new session.
        if (isSessionInactive(Context.config.sessionLengthInMinutesOverride)) {
          this.generateNewSession();
        }
      } catch (e) {
        // Error parsing the last active timestamp, create a new session.
        this.generateNewSession();
      }
    } else {
      // There is no previous session information, create a new session.
      this.generateNewSession();
    }

    // Update the last-active timestamp in LocalStorage to the current time.
    localStorage.setItem("glean_session_last_active", Date.now().toString());
  }

  /**
   * Generates and sets the client_id if it is not set,
   * or if the current value is corrupted.
   */
  private initializeClientId(): void {
    let needNewClientId = false;
    const clientIdData = Context.metricsDatabase.getMetric(
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
    const firstRunDate = Context.metricsDatabase.getMetric(
      CLIENT_INFO_STORAGE,
      this.firstRunDate
    );

    if (!firstRunDate) {
      this.firstRunDate.set();
    }
  }

  private generateNewSession(): void {
    this.sessionId.generateAndSet();
    this.sessionCount.add();
  }
}
