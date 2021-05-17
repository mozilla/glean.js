/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CLIENT_INFO_STORAGE, KNOWN_CLIENT_ID } from "./constants.js";
import type { ConfigurationInterface } from "./config.js";
import { Configuration } from "./config.js";
import MetricsDatabase from "./metrics/database.js";
import PingsDatabase from "./pings/database.js";
import PingUploader from "./upload/index.js";
import { isUndefined, sanitizeApplicationId } from "./utils.js";
import { CoreMetrics } from "./internal_metrics.js";
import EventsDatabase from "./metrics/events_database.js";
import UUIDMetricType from "./metrics/types/uuid.js";
import DatetimeMetricType, { DatetimeMetric } from "./metrics/types/datetime.js";
import CorePings from "./internal_pings.js";
import { registerPluginToEvent, testResetEvents } from "./events/utils.js";
import ErrorManager from "./error/index.js";
import type Platform from "../platform/index.js";
import TestPlatform from "../platform/test/index.js";
import { Lifetime } from "./metrics/lifetime.js";
import { Context } from "./context.js";

class Glean {
  // The Glean singleton.
  private static _instance?: Glean;

  // Instances of Glean's core metrics.
  private _coreMetrics: CoreMetrics;
  // Instances of Glean's core pings.
  private _corePings: CorePings;

  // The environment must be set before initialize.
  private _platform?: Platform;

  // Properties that will only be set on `initialize`.

  // The ping uploader. Note that we need to use the definite assignment assertion
  // because initialization will not happen in the constructor, but in the `initialize`
  // method.
  private _pingUploader!: PingUploader;
  // The Glean configuration object.
  private _config!: Configuration;

  private constructor() {
    if (!isUndefined(Glean._instance)) {
      throw new Error(
        `Tried to instantiate Glean through \`new\`.
      Use Glean.instance instead to access the Glean singleton.`);
    }

    this._coreMetrics = new CoreMetrics();
    this._corePings = new CorePings();
  }

  private static get instance(): Glean {
    if (!Glean._instance) {
      Glean._instance = new Glean();
    }

    return Glean._instance;
  }

  private static get pingUploader(): PingUploader {
    return Glean.instance._pingUploader;
  }

  static get coreMetrics(): CoreMetrics {
    return Glean.instance._coreMetrics;
  }

  private static get corePings(): CorePings {
    return Glean.instance._corePings;
  }

  /**
   * Handles the changing of state from upload disabled to enabled.
   *
   * Should only be called when the state actually changes.
   *
   * The `uploadEnabled` flag is set to true and the core Glean metrics are recreated.
   */
  private static async onUploadEnabled(): Promise<void> {
    Context.uploadEnabled = true;
    await Glean.coreMetrics.initialize(Glean.instance._config, Glean.platform, Context.metricsDatabase);
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
  private static async onUploadDisabled(): Promise<void> {
    Context.uploadEnabled = false;
    await Glean.clearMetrics();
    // Note that `submit` is a dispatched function.
    // The actual submission will only happen after we leave `onUploadDisabled`.
    Glean.corePings.deletionRequest.submit();
  }

  /**
   * Clears any pending metrics and pings.
   *
   * This function is only supposed to be called when telemetry is disabled.
   */
  private static async clearMetrics(): Promise<void> {
    // Stop ongoing upload jobs and clear pending pings queue.
    await Glean.pingUploader.clearPendingPingsQueue();

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
          Glean.coreMetrics.firstRunDate
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
    await UUIDMetricType._private_setUndispatched(Glean.coreMetrics.clientId, KNOWN_CLIENT_ID);

    // Restore the first_run_date.
    await DatetimeMetricType._private_setUndispatched(Glean.coreMetrics.firstRunDate, firstRunDate);

    Context.uploadEnabled = false;
  }

  /**
   * Initialize Glean. This method should only be called once, subsequent calls will be no-op.
   *
   * @param applicationId The application ID (will be sanitized during initialization).
   * @param uploadEnabled Determines whether telemetry is enabled.
   *        If disabled, all persisted metrics, events and queued pings
   *        (except first_run_date) are cleared.
   * @param config Glean configuration options.
   *
   * @throws
   * - If config.serverEndpoint is an invalid URL;
   * - If the application if is an empty string.
   */
  static initialize(
    applicationId: string,
    uploadEnabled: boolean,
    config?: ConfigurationInterface
  ): void {
    if (Context.initialized) {
      console.warn("Attempted to initialize Glean, but it has already been initialized. Ignoring.");
      return;
    }

    if (applicationId.length === 0) {
      console.error("Unable to initialize Glean, applicationId cannot be an empty string.");
      return;
    }

    if (!Glean.instance._platform) {
      console.error("Unable to initialize Glean, environment has not been set.");
      return;
    }

    // The configuration constructor will throw in case config has any incorrect prop.
    const correctConfig = new Configuration(config);

    Context.metricsDatabase = new MetricsDatabase(Glean.platform.Storage);
    Context.eventsDatabase = new EventsDatabase(Glean.platform.Storage);
    Context.pingsDatabase = new PingsDatabase(Glean.platform.Storage);
    Context.errorManager = new ErrorManager();

    Glean.instance._pingUploader = new PingUploader(correctConfig, Glean.platform, Context.pingsDatabase);

    Context.pingsDatabase.attachObserver(Glean.pingUploader);

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
      Context.applicationId = sanitizeApplicationId(applicationId);
      Context.debugOptions = correctConfig.debug;
      Glean.instance._config = correctConfig;

      // Clear application lifetime metrics.
      //
      // IMPORTANT!
      // Any pings we want to send upon initialization should happen before this.
      await Context.metricsDatabase.clear(Lifetime.Application);

      // We need to mark Glean as initialized before dealing with the upload status,
      // otherwise we will not be able to submit deletion-request pings if necessary.
      //
      // This is fine, we are inside a dispatched task that is guaranteed to run before any
      // other task. No external API call will be executed before we leave this task.
      Context.initialized = true;
      Glean.pingUploader.setInitialized(true);

      // The upload enabled flag may have changed since the last run, for
      // example by the changing of a config file.
      if (uploadEnabled) {
        // If upload is enabled, just follow the normal code path to
        // instantiate the core metrics.
        await Glean.onUploadEnabled();
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
          Glean.coreMetrics.clientId
        );

        if (clientId) {
          if (clientId !== KNOWN_CLIENT_ID) {
            await Glean.onUploadDisabled();
          }
        } else {
          // Call `clearMetrics` directly here instead of `onUploadDisabled` to avoid sending
          // a deletion-request ping for a user that has already done that.
          await Glean.clearMetrics();
        }
      }

      await Context.pingsDatabase.scanPendingPings();

      // Even though this returns a promise, there is no need to block on it returning.
      //
      // On the contrary we _want_ the uploading tasks to be executed async.
      void Glean.pingUploader.triggerUpload();
    });
  }

  static get serverEndpoint(): string | undefined {
    return Glean.instance._config?.serverEndpoint;
  }

  static get logPings(): boolean {
    return Glean.instance._config?.debug?.logPings || false;
  }

  static get debugViewTag(): string | undefined {
    return Glean.instance._config?.debug.debugViewTag;
  }

  static get sourceTags(): string | undefined {
    return Glean.instance._config?.debug.sourceTags?.toString();
  }

  static get platform(): Platform {
    if (!Glean.instance._platform) {
      throw new Error("IMPOSSIBLE: Attempted to access environment specific APIs before Glean was initialized.");
    }

    return Glean.instance._platform;
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
  static setUploadEnabled(flag: boolean): void {
    Context.dispatcher.launch(async () => {
      if (!Context.initialized) {
        console.error(
          "Changing upload enabled before Glean is initialized is not supported.\n",
          "Pass the correct state into `Glean.initialize\n`.",
          "See documentation at https://mozilla.github.io/glean/book/user/general-api.html#initializing-the-glean-sdk`"
        );
        return;
      }

      if (Context.uploadEnabled !== flag) {
        if (flag) {
          await Glean.onUploadEnabled();
        } else {
          await Glean.onUploadDisabled();
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
  static setLogPings(flag: boolean): void {
    Context.dispatcher.launch(() => {
      Glean.instance._config.debug.logPings = flag;

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
   * To unset the `debugViewTag` call `Glean.unsetDebugViewTag();
   *
   * @param value The value of the header.
   *        This value must satify the regex `^[a-zA-Z0-9-]{1,20}$` otherwise it will be ignored.
   */
  static setDebugViewTag(value: string): void {
    if (!Configuration.validateDebugViewTag(value)) {
      console.error(`Invalid \`debugViewTag\` ${value}. Ignoring.`);
      return;
    }

    Context.dispatcher.launch(() => {
      Glean.instance._config.debug.debugViewTag = value;

      // The dispatcher requires that dispatched functions return promises.
      return Promise.resolve();
    });
  }

  /**
   * Unsets the `debugViewTag` debug option.
   *
   * This is a no-op is case there is no `debugViewTag` set at the moment.
   */
  static unsetDebugViewTag(): void {
    Context.dispatcher.launch(() => {
      delete Glean.instance._config.debug.debugViewTag;
      return Promise.resolve();
    });
  }

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
  static setSourceTags(value: string[]): void {
    if (!Configuration.validateSourceTags(value)) {
      console.error(`Invalid \`sourceTags\` ${value.toString()}. Ignoring.`);
      return;
    }

    Context.dispatcher.launch(() => {
      Glean.instance._config.debug.sourceTags = value;

      // The dispatcher requires that dispatched functions return promises.
      return Promise.resolve();
    });
  }

  /**
   * Unsets the `sourceTags` debug option.
   *
   * This is a no-op is case there are no `sourceTags` set at the moment.
   */
  static unsetSourceTags(): void {
    Context.dispatcher.launch(() => {
      delete Glean.instance._config.debug.sourceTags;
      return Promise.resolve();
    });
  }

  /**
   * Sets the current environment.
   *
   * This function **must** be called before Glean.initialize.
   *
   * @param platform The environment to set.
   *        Please check out the available environments in the platform/ module.
   */
  static setPlatform(platform: Platform): void {
    // Platform can only be set if Glean is uninitialized,
    // because Glean.initialize will make sure to recreate any
    // databases in case another platform was set previously.
    //
    // **Note**: Users should only be able to replace the platform in testing
    // situations, if they call Glean.initialize before calling Glean.testResetGlean.
    // We want to replace whatever platform was set by Glean.initialize with the
    // testing platforms in this case and that is possible because Glean.testResetGlean
    // uninitializes Glean before setting the testing platform.
    if (Context.initialized) {
      return;
    }

    // In case the platform is being swapped in the test scenario described above,
    // we log a debug message about the change.
    if (Glean.instance._platform && Glean.instance._platform.name !== platform.name) {
      // TODO: Only show this message outside of test mode, and rephrase it as an error (depends on Bug 1682771).
      console.debug(
        `Changing Glean platform from "${Glean.platform.name}" to "${platform.name}".`,
      );
    }

    Glean.instance._platform = platform;
  }

  /**
   * **Test-only API**
   *
   * Initializes Glean in testing mode.
   *
   * All platform specific APIs will be mocked.
   *
   * @param applicationId The application ID (will be sanitized during initialization).
   * @param uploadEnabled Determines whether telemetry is enabled.
   *        If disabled, all persisted metrics, events and queued pings (except
   *        first_run_date) are cleared. Default to `true`.
   * @param config Glean configuration options.
   */
  static async testInitialize(
    applicationId: string,
    uploadEnabled = true,
    config?: ConfigurationInterface
  ): Promise<void> {
    Glean.setPlatform(TestPlatform);
    Glean.initialize(applicationId, uploadEnabled, config);

    await Context.dispatcher.testBlockOnQueue();
  }

  /**
   * **Test-only API**
   *
   * Resets the Glean to an uninitialized state.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   */
  static async testUninitialize(): Promise<void> {
    // Get back to an uninitialized state.
    await Context.testUninitialize();

    // Deregister all plugins
    testResetEvents();

    // Stop ongoing jobs and clear pending pings queue.
    if (Glean.pingUploader) {
      // The first time tests run, before Glean is initialized, we are
      // not guaranteed to have an uploader. Account for this.
      await Glean.pingUploader.clearPendingPingsQueue();
    }
  }

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
  static async testResetGlean(
    applicationId: string,
    uploadEnabled = true,
    config?: ConfigurationInterface
  ): Promise<void> {
    await Glean.testUninitialize();

    // Clear the databases.
    try {
      await Context.eventsDatabase.clearAll();
      await Context.metricsDatabase.clearAll();
      await Context.pingsDatabase.clearAll();
    } catch {
      // Nothing to do here.
      // It is expected that these will fail in case we are initializing Glean for the first time.
    }

    // Re-Initialize Glean.
    await Glean.testInitialize(applicationId, uploadEnabled, config);
  }
}

export default Glean;
