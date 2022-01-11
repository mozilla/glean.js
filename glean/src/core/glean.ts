/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CLIENT_INFO_STORAGE, KNOWN_CLIENT_ID } from "./constants.js";
import type { ConfigurationInterface } from "./config.js";
import { Configuration } from "./config.js";
import MetricsDatabase from "./metrics/database.js";
import PingsDatabase from "./pings/database.js";
import PingUploadManager from "./upload/manager.js";
import { isBoolean, isString, sanitizeApplicationId } from "./utils.js";
import { CoreMetrics } from "./internal_metrics.js";
import EventsDatabase from "./metrics/events_database/index.js";
import UUIDMetricType from "./metrics/types/uuid.js";
import DatetimeMetricType, { DatetimeMetric } from "./metrics/types/datetime.js";
import CorePings from "./internal_pings.js";
import { registerPluginToEvent } from "./events/utils.js";
import ErrorManager from "./error/index.js";
import type Platform from "../platform/index.js";
import { Lifetime } from "./metrics/lifetime.js";
import { Context } from "./context.js";
import PingType from "./pings/ping_type.js";
import log, { LoggingLevel } from "./log.js";

const LOG_TAG = "core.Glean";

namespace Glean {
  // The below properties are exported for testing purposes.
  //
  // Instances of Glean's core metrics.
  export const coreMetrics = new CoreMetrics();
  // Instances of Glean's core pings.
  export const corePings = new CorePings();
  // An instance of the ping uploader.
  export let pingUploader: PingUploadManager;

  /**
   * Handles the changing of state from upload disabled to enabled.
   *
   * Should only be called when the state actually changes.
   *
   * The `uploadEnabled` flag is set to true and the core Glean metrics are recreated.
   */
  async function onUploadEnabled(): Promise<void> {
    Context.uploadEnabled = true;
    await coreMetrics.initialize();
  }

  /**
   * Handles the changing of state from upload enabled to disabled.
   *
   * Should only be called when the state actually changes.
   *
   * A deletion_request ping is sent, all pending metrics, events and queued
   * pings are cleared, and the client_id is set to KNOWN_CLIENT_ID.
   * Afterward, the upload_enabled flag is set to false.
   */
  async function onUploadDisabled(): Promise<void> {
    // It's fine to set this before submitting the deletion request ping,
    // that ping is still sent even if upload is disabled.
    Context.uploadEnabled = false;
    // We need to use an undispatched submission to guarantee that the
    // ping is collected before metric are cleared, otherwise we end up
    // with malformed pings.
    await PingType._private_submitUndispatched(corePings.deletionRequest);
    await clearMetrics();
  }

  /**
   * Clears any pending metrics and pings.
   *
   * This function is only supposed to be called when telemetry is disabled.
   */
  async function clearMetrics(): Promise<void> {
    // Clear enqueued upload jobs and clear pending pings queue.
    //
    // The only job that will still be sent is the deletion-request ping.
    await pingUploader.clearPendingPingsQueue();

    // There is only one metric that we want to survive after clearing all
    // metrics: first_run_date. Here, we store its value
    // so we can restore it after clearing the metrics.
    //
    // Note: This will throw in case the stored metric is incorrect or inexistent.
    // The most likely is that it throws if the metrics hasn't been set,
    // e.g. we start Glean for the first with upload disabled.
    let firstRunDate: Date;
    try {
      firstRunDate = new DatetimeMetric(
        await Context.metricsDatabase.getMetric(
          CLIENT_INFO_STORAGE,
          coreMetrics.firstRunDate
        )
      ).date;
    } catch {
      firstRunDate = new Date();
    }

    // Clear the databases.
    await Context.eventsDatabase.clearAll();
    await Context.metricsDatabase.clearAll();
    await Context.pingsDatabase.clearAll();

    // We need to briefly set upload_enabled to true here so that `set`
    // is not a no-op.
    //
    // This is safe.
    //
    // `clearMetrics` is either called on `initialize` or `setUploadEnabled`.
    // Both are dispatched tasks, which means that any other dispatched task
    // called after them will only be executed after they are done.
    // Since all external API calls are dispatched, it is not possible
    // for any other API call to be execute concurrently with this one.
    Context.uploadEnabled = true;

    // Store a "dummy" KNOWN_CLIENT_ID in the client_id metric. This will
    // make it easier to detect if pings were unintentionally sent after
    // uploading is disabled.
    await UUIDMetricType._private_setUndispatched(coreMetrics.clientId, KNOWN_CLIENT_ID);

    // Restore the first_run_date.
    await DatetimeMetricType._private_setUndispatched(coreMetrics.firstRunDate, firstRunDate);

    Context.uploadEnabled = false;
  }

  /**
   * Initialize  This method should only be called once, subsequent calls will be no-op.
   *
   * @param applicationId The application ID (will be sanitized during initialization).
   * @param uploadEnabled Determines whether telemetry is enabled.
   *        If disabled, all persisted metrics, events and queued pings
   *        (except first_run_date) are cleared.
   * @param config Glean configuration options.
   * @throws
   * - If config.serverEndpoint is an invalid URL;
   * - If the application if is an empty string.
   */
  export function initialize(
    applicationId: string,
    uploadEnabled: boolean,
    config?: ConfigurationInterface
  ): void {
    if (Context.initialized) {
      log(
        LOG_TAG,
        "Attempted to initialize Glean, but it has already been initialized. Ignoring.",
        LoggingLevel.Warn
      );
      return;
    }

    if (!isString(applicationId)) {
      log(
        LOG_TAG,
        "Unable to initialize Glean, applicationId must be a string.",
        LoggingLevel.Error
      );
      return;
    }

    if (!isBoolean(uploadEnabled)) {
      log(
        LOG_TAG,
        "Unable to initialize Glean, uploadEnabled must be a boolean.",
        LoggingLevel.Error
      );
      return;
    }

    if (applicationId.length === 0) {
      log(
        LOG_TAG,
        "Unable to initialize Glean, applicationId cannot be an empty string.",
        LoggingLevel.Error
      );
      return;
    }

    if (!Context.platform) {
      log(
        LOG_TAG,
        "Unable to initialize Glean, platform has not been set.",
        LoggingLevel.Error
      );
      return;
    }

    Context.applicationId = sanitizeApplicationId(applicationId);

    // The configuration constructor will throw in case config has any incorrect prop.
    const correctConfig = new Configuration(config);
    Context.config = correctConfig;

    Context.metricsDatabase = new MetricsDatabase();
    Context.eventsDatabase = new EventsDatabase();
    Context.pingsDatabase = new PingsDatabase();
    Context.errorManager = new ErrorManager();

    pingUploader = new PingUploadManager(correctConfig, Context.pingsDatabase);

    if (config?.plugins) {
      for (const plugin of config.plugins) {
        registerPluginToEvent(plugin);
      }
    }

    // Initialize the dispatcher and execute init before any other enqueued task.
    //
    // Note: We decide to execute the above tasks outside of the dispatcher task,
    // because they will throw if configuration is incorrect and we want them to throw.
    //
    // The dispatcher will catch and log any exceptions.
    Context.dispatcher.flushInit(async () => {
      // We need to mark Glean as initialized before dealing with the upload status,
      // otherwise we will not be able to submit deletion-request pings if necessary.
      //
      // This is fine, we are inside a dispatched task that is guaranteed to run before any
      // other task. No external API call will be executed before we leave this task.
      Context.initialized = true;

      Context.uploadEnabled = uploadEnabled;
      // The upload enabled flag may have changed since the last run, for
      // example by the changing of a config file.
      if (uploadEnabled) {
        // IMPORTANT!
        // Any pings we want to send upon initialization should happen before this line.
        //
        // Clear application lifetime metrics.
        //
        // If upload is disabled we don't need to do this,
        // all metrics will be cleared anyways and we want
        // application lifetime metrics intact in case
        // we need to send a deletion-request ping.
        await Context.metricsDatabase.clear(Lifetime.Application);

        // If upload is enabled,
        // just follow the normal code path to instantiate the core metrics.
        await onUploadEnabled();
      } else {
        // If upload is disabled, and we've never run before, only set the
        // client_id to KNOWN_CLIENT_ID, but do not send a deletion request
        // ping.
        // If we have run before, and if the client_id is not equal to
        // the KNOWN_CLIENT_ID, do the full upload disabled operations to
        // clear metrics, set the client_id to KNOWN_CLIENT_ID, and send a
        // deletion request ping.
        const clientId = await Context.metricsDatabase.getMetric(
          CLIENT_INFO_STORAGE,
          coreMetrics.clientId
        );

        if (clientId) {
          if (clientId !== KNOWN_CLIENT_ID) {
            await onUploadDisabled();
          }
        } else {
          // Call `clearMetrics` directly here instead of `onUploadDisabled` to avoid sending
          // a deletion-request ping for a user that has already done that.
          await clearMetrics();
        }
      }

      // Initialize the events database.
      //
      // It's important this happens _after_ the upload state is dealt with,
      // because initializing the events database may record the execution_counter and
      // glean.restarted metrics. If the upload state is not defined these metrics can't be recorded.
      await Context.eventsDatabase.initialize();

      // We only scan the pendings pings **after** dealing with the upload state.
      // If upload is disabled, pending pings files are deleted
      // so we need to know that state **before** scanning the pending pings
      // to ensure we don't enqueue pings before their files are deleted.
      await Context.pingsDatabase.scanPendingPings();
    });
  }

  /**
   * Sets whether upload is enabled or not.
   *
   * When uploading is disabled, metrics aren't recorded at all and no
   * data is uploaded.
   *
   * When disabling, all pending metrics, events and queued pings are cleared.
   *
   * When enabling, the core Glean metrics are recreated.
   *
   * If the value of this flag is not actually changed, this is a no-op.
   *
   * @param flag When true, enable metric collection.
   */
  export function setUploadEnabled(flag: boolean): void {
    if (!Context.initialized) {
      log(
        LOG_TAG,
        [
          "Changing upload enabled before Glean is initialized is not supported.\n",
          "Pass the correct state into `initialize`.\n",
          "See documentation at https://mozilla.github.io/glean/book/user/general-api.html#initializing-the-glean-sdk`"
        ],
        LoggingLevel.Error
      );
      return;
    }

    if (!isBoolean(flag)) {
      log(
        LOG_TAG,
        "Unable to change upload state, new value must be a boolean. Ignoring.",
        LoggingLevel.Error
      );
      return;
    }

    Context.dispatcher.launch(async () => {
      if (Context.uploadEnabled !== flag) {
        if (flag) {
          await onUploadEnabled();
        } else {
          await onUploadDisabled();
        }
      }
    });
  }

  /**
   * Sets the `logPings` debug option.
   *
   * When this flag is `true` pings will be logged to the console right before they are collected.
   *
   * @param flag Whether or not to log pings.
   */
  export function setLogPings(flag: boolean): void {
    Context.dispatcher.launch(() => {
      Context.config.logPings = flag;

      // The dispatcher requires that dispatched functions return promises.
      return Promise.resolve();
    });
  }

  /**
   * Sets the `debugViewTag` debug option.
   *
   * When this property is set, all subsequent outgoing pings will include the `X-Debug-ID` header
   * which will redirect them to the ["Ping Debug Viewer"](https://debug-ping-preview.firebaseapp.com/).
   *
   *
   * @param value The value of the header.
   *        This value must satify the regex `^[a-zA-Z0-9-]{1,20}$` otherwise it will be ignored.
   */
  export function setDebugViewTag(value: string): void {
    Context.dispatcher.launch(() => {
      Context.config.debugViewTag = value;

      // The dispatcher requires that dispatched functions return promises.
      return Promise.resolve();
    });
  }

  /**
   * Sets the `sourceTags` debug option.
   *
   * Ping tags will show in the destination datasets, after ingestion.
   *
   * Note** Setting `sourceTags` will override all previously set tags.
   *
   * To unset the `sourceTags` call `unsetSourceTags();
   *
   * @param value A vector of at most 5 valid HTTP header values.
   *        Individual tags must match the regex: "[a-zA-Z0-9-]{1,20}".
   */
  export function setSourceTags(value: string[]): void {
    Context.dispatcher.launch(() => {
      Context.config.sourceTags = value;

      // The dispatcher requires that dispatched functions return promises.
      return Promise.resolve();
    });
  }

  /**
   * Finishes executing all pending tasks
   * and shuts down both Glean's dispatcher and the ping uploader.
   *
   * If Glean is not initialized this is a no-op.
   *
   * # Important
   *
   * This is irreversible.
   * Only a restart will return Glean back to an idle state.
   *
   * @returns A promise which resolves once the shutdown is complete.
   */
  export async function shutdown(): Promise<void> {
    if (!Context.initialized) {
      log(LOG_TAG, "Attempted to shutdown Glean, but Glean is not initialized. Ignoring.");
      return;
    }

    // Order here matters!
    //
    // The dispatcher needs to be shutdown first,
    // because some of its tasks may enqueue new pings to upload
    // and we want these uploading tasks to also be executed prior to complete shutdown.
    await Context.dispatcher.shutdown();
    await pingUploader.blockOnOngoingUploads();
  }

  /**
   * Sets the current environment.
   *
   * This function **must** be called before initialize.
   *
   * @param platform The environment to set.
   *        Please check out the available environments in the platform/ module.
   */
  export function setPlatform(platform: Platform): void {
    // Platform can only be set if Glean is uninitialized,
    // because initialize will make sure to recreate any
    // databases in case another platform was set previously.
    //
    // **Note**: Users should only be able to replace the platform in testing
    // situations, if they call initialize before calling testReset
    // We want to replace whatever platform was set by initialize with the
    // testing platforms in this case and that is possible because testResetGlean
    // uninitializes Glean before setting the testing platform.
    if (Context.initialized) {
      return;
    }

    if (Context.isPlatformSet() && Context.platform.name !== platform.name && !Context.testing) {
      log(
        LOG_TAG,
        [
          `IMPOSSIBLE: Attempted to change Glean's targeted platform",
          "from "${Context.platform.name}" to "${platform.name}". Ignoring.`,
        ],
        LoggingLevel.Error
      );
    }

    Context.platform = platform;
  }
}

export default Glean;
