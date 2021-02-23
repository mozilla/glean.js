/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Glean from "../core/glean";
import { ConfigurationInterface } from "../core/config";

import platform from "../platform/qt";

// Private Glean types to export.
import PingType from "../core/pings";
import BooleanMetricType from "../core/metrics/types/boolean";
import CounterMetricType from "../core/metrics/types/counter";
import DatetimeMetricType from "../core/metrics/types/datetime";
import EventMetricType from "../core/metrics/types/event";
import StringMetricType from "../core/metrics/types/string";
import UUIDMetricType from "../core/metrics/types/uuid";

export default {
  /**
   * Initialize Glean. This method should only be called once, subsequent calls will be no-op.
   *
   * # Note
   *
   * Before this method is called Glean will not be able to upload pings or record metrics,
   * all such operations will be no-op.
   *
   * This is _not_ the way glean-core deals with this. It will record tasks performed before init
   * and flush them on init. We have a bug to figure out how to do that for Glean.js, Bug 1687491.
   *
   * @param applicationId The application ID (will be sanitized during initialization).
   * @param uploadEnabled Determines whether telemetry is enabled.
   *                      If disabled, all persisted metrics, events and queued pings (except
   *                      first_run_date) are cleared.
   * @param config Glean configuration options.
   */
  initialize(
    applicationId: string,
    uploadEnabled: boolean,
    config?: ConfigurationInterface
  ): void {
    Glean.setPlatform(platform);
    Glean.initialize(applicationId, uploadEnabled, config);
  },

  /**
   * Sets whether upload is enabled or not.
   *
   * When uploading is disabled, metrics aren't recorded at all and no data is uploaded.
   *
   * When disabling, all pending metrics, events and queued pings are cleared.
   *
   * When enabling, the core Glean metrics are recreated.
   *
   * If the value of this flag is not actually changed, this is a no-op.
   *
   * If Glean has not been initialized yet, this is also a no-op.
   *
   * @param flag When true, enable metric collection.
   */
  setUploadEnabled(flag: boolean): void {
    Glean.setUploadEnabled(flag);
  },

  /**
   * Sets the `logPings` flag.
   *
   * When this flag is `true` pings will be logged
   * to the console right before they are collected.
   *
   * @param flag Whether or not to log pings.
   */
  setLogPings(flag: boolean): void {
    Glean.setLogPings(flag);
  },

  _private: {
    PingType,
    BooleanMetricType,
    CounterMetricType,
    DatetimeMetricType,
    EventMetricType,
    StringMetricType,
    UUIDMetricType
  }
};
