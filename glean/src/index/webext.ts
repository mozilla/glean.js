/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Glean from "../core/glean.js";
import { ConfigurationInterface } from "../core/config.js";

import platform from "../platform/webext/index.js";

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
   * Sets the `logPings` debug option.
   *
   * When this flag is `true` pings will be logged
   * to the console right before they are collected.
   *
   * @param flag Whether or not to log pings.
   */
  setLogPings(flag: boolean): void {
    Glean.setLogPings(flag);
  },

  /**
   * Sets the `debugViewTag` debug option.
   *
   * When this property is set, all subsequent outgoing pings will include the `X-Debug-ID` header
   * which will redirect them to the ["Ping Debug Viewer"](https://debug-ping-preview.firebaseapp.com/).
   *
   * To unset the `debugViewTag` call `Glean.unsetDebugViewTag();
   *
   * @param value The value of the header.
   *        This value must satify the regex `^[a-zA-Z0-9-]{1,20}$` otherwise it will be ignored.
   */
  setDebugViewTag(value: string): void {
    Glean.setDebugViewTag(value);
  },

  /**
   * Unsets the `debugViewTag` debug option.
   *
   * This is a no-op is case there is no `debugViewTag` set at the moment.
   */
  unsetDebugViewTag(): void {
    Glean.unsetDebugViewTag();
  },

  /**
   * Sets the `sourceTags` debug option.
   *
   * Ping tags will show in the destination datasets, after ingestion.
   *
   * **Note** Setting `sourceTags` will override all previously set tags.
   *
   * To unset the `sourceTags` call `Glean.unsetSourceTags();
   *
   * @param value A vector of at most 5 valid HTTP header values.
   *        Individual tags must match the regex: "[a-zA-Z0-9-]{1,20}".
   */
  setSourceTags(value: string[]): void {
    Glean.setSourceTags(value);
  },

  /**
   * Unsets the `sourceTags` debug option.
   *
   * This is a no-op is case there are no `sourceTags` set at the moment.
   */
  unsetSourceTags(): void {
    Glean.unsetSourceTags();
  },

  /**
   * **Test-only API**
   *
   * Resets the Glean singleton to its initial state and re-initializes it.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   *
   * @param applicationId The application ID (will be sanitized during initialization).
   * @param uploadEnabled Determines whether telemetry is enabled.
   *        If disabled, all persisted metrics, events and queued pings (except
   *        first_run_date) are cleared. Default to `true`.
   * @param config Glean configuration options.
   */
   async testResetGlean(
    applicationId: string,
    uploadEnabled = true,
    config?: ConfigurationInterface
  ): Promise<void> {
    return Glean.testResetGlean(applicationId, uploadEnabled, config);
  }
};
