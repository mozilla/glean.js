/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CLIENT_INFO_STORAGE, KNOWN_CLIENT_ID } from "./constants";
import { Configuration, ConfigurationInterface } from "./config";
import MetricsDatabase from "./metrics/database";
import PingsDatabase from "./pings/database";
import PingUploader from "./upload";
import { isUndefined, sanitizeApplicationId } from "./utils";
import { CoreMetrics } from "./internal_metrics";
import { Lifetime } from "./metrics";
import EventsDatabase from "./metrics/events_database";
import UUIDMetricType from "./metrics/types/uuid";
import DatetimeMetricType, { DatetimeMetric } from "./metrics/types/datetime";
import Dispatcher from "./dispatcher";
import CorePings from "./internal_pings";
import { registerPluginToEvent, testResetEvents } from "./events/utils";

import Platform from "../platform/index";
import TestPlatform from "../platform/test";

class Glean {
  // The Glean singleton.
  private static _instance?: Glean;

  // Whether or not Glean has been initialized.
  private _initialized: boolean;
  // Instances of Glean's core metrics.
  private _coreMetrics: CoreMetrics;
  // Instances of Glean's core pings.
  private _corePings: CorePings;
  // The ping uploader.
  private _pingUploader: PingUploader
  // A task dispatcher to help execute in order asynchronous external API calls.
  private _dispatcher: Dispatcher;

  // The environment must be set before initialize.
  private _platform?: Platform;

  // Properties that will only be set on `initialize`.

  // The application ID (will be sanitized during initialization).
  private _applicationId?: string;
  // Whether or not to record metrics.
  private _uploadEnabled?: boolean;
  // The Glean configuration object.
  private _config?: Configuration;
  // The metrics and pings databases.
  private _db?: {
    metrics: MetricsDatabase,
    events: EventsDatabase,
    pings: PingsDatabase
  };

  private constructor() {
    if (!isUndefined(Glean._instance)) {
      throw new Error(
        `Tried to instantiate Glean through \`new\`.
      Use Glean.instance instead to access the Glean singleton.`);
    }

    this._dispatcher = new Dispatcher();
    this._pingUploader = new PingUploader();
    this._coreMetrics = new CoreMetrics();
    this._corePings = new CorePings();
    this._initialized = false;
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

  private static get coreMetrics(): CoreMetrics {
    return Glean.instance._coreMetrics;
  }

  private static get corePings(): CorePings {
    return Glean.instance._corePings;
  }

  private static get uploadEnabled(): boolean {
    return Glean.instance._uploadEnabled || false;
  }

  private static set uploadEnabled(value: boolean) {
    Glean.instance._uploadEnabled = value;
  }

  /**
   * Handles the changing of state from upload disabled to enabled.
   *
   * Should only be called when the state actually changes.
   *
   * The `uploadEnabled` flag is set to true and the core Glean metrics are recreated.
   */
  private static async onUploadEnabled(): Promise<void> {
    Glean.uploadEnabled = true;
    await Glean.coreMetrics.initialize();
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
    Glean.uploadEnabled = false;
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
        await Glean.metricsDatabase.getMetric(
          CLIENT_INFO_STORAGE,
          Glean.coreMetrics.firstRunDate
        )
      ).date;
    } catch {
      firstRunDate = new Date();
    }

    // Clear the databases.
    await Glean.eventsDatabase.clearAll();
    await Glean.metricsDatabase.clearAll();
    await Glean.pingsDatabase.clearAll();

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
    Glean.uploadEnabled = true;

    // Store a "dummy" KNOWN_CLIENT_ID in the client_id metric. This will
    // make it easier to detect if pings were unintentionally sent after
    // uploading is disabled.
    await UUIDMetricType._private_setUndispatched(Glean.coreMetrics.clientId, KNOWN_CLIENT_ID);

    // Restore the first_run_date.
    await DatetimeMetricType._private_setUndispatched(Glean.coreMetrics.firstRunDate, firstRunDate);

    Glean.uploadEnabled = false;
  }

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
    if (Glean.initialized) {
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

    if (!Glean.instance._db) {
      Glean.instance._db = {
        metrics: new MetricsDatabase(),
        events: new EventsDatabase(),
        pings: new PingsDatabase(Glean.pingUploader)
      };
    }

    // The configuration constructor will throw in case config has any incorrect prop.
    const correctConfig = new Configuration(config);

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
    Glean.dispatcher.flushInit(async () => {
      Glean.instance._applicationId = sanitizeApplicationId(applicationId);
      Glean.instance._config = correctConfig;

      // Clear application lifetime metrics.
      //
      // IMPORTANT!
      // Any pings we want to send upon initialization should happen before this.
      await Glean.metricsDatabase.clear(Lifetime.Application);

      // We need to mark Glean as initialized before dealing with the upload status,
      // otherwise we will not be able to submit deletion-request pings if necessary.
      //
      // This is fine, we are inside a dispatched task that is guaranteed to run before any
      // other task. No external API call will be executed before we leave this task.
      Glean.instance._initialized = true;

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
        const clientId = await Glean.metricsDatabase.getMetric(
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

      await Glean.pingUploader.scanPendingPings();

      // Even though this returns a promise, there is no need to block on it returning.
      //
      // On the contrary we _want_ the uploading tasks to be executed async.
      void Glean.pingUploader.triggerUpload();
    });
  }

  static get metricsDatabase(): MetricsDatabase {
    if (!Glean.instance._db) {
      throw new Error("IMPOSSIBLE: Attempted to access the metrics database before Glean was initialized.");
    }

    return Glean.instance._db.metrics;
  }

  static get eventsDatabase(): EventsDatabase {
    if (!Glean.instance._db) {
      throw new Error("IMPOSSIBLE: Attempted to access the events database before Glean was initialized.");
    }

    return Glean.instance._db.events;
  }

  static get pingsDatabase(): PingsDatabase {
    if (!Glean.instance._db) {
      throw new Error("IMPOSSIBLE: Attempted to access the pings database before Glean was initialized.");
    }

    return Glean.instance._db.pings;
  }

  static get initialized(): boolean {
    return Glean.instance._initialized;
  }

  static get applicationId(): string | undefined {
    return Glean.instance._applicationId;
  }

  static get serverEndpoint(): string | undefined {
    return Glean.instance._config?.serverEndpoint;
  }

  static get logPings(): boolean {
    return Glean.instance._config?.debug?.logPings || false;
  }

  static get dispatcher(): Dispatcher {
    return Glean.instance._dispatcher;
  }

  static get platform(): Platform {
    if (!Glean.instance._platform) {
      throw new Error("IMPOSSIBLE: Attempted to access environment specific APIs before Glean was initialized.");
    }

    return Glean.instance._platform;
  }

  /**
   * Determines whether upload is enabled.
   *
   * When upload is disabled, no data will be recorded.
   *
   * @returns Whether upload is enabled.
   */
  static isUploadEnabled(): boolean {
    return Glean.uploadEnabled;
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
    Glean.dispatcher.launch(async () => {
      if (!Glean.initialized) {
        console.error(
          "Changing upload enabled before Glean is initialized is not supported.\n",
          "Pass the correct state into `Glean.initialize\n`.",
          "See documentation at https://mozilla.github.io/glean/book/user/general-api.html#initializing-the-glean-sdk`"
        );
        return;
      }

      if (Glean.uploadEnabled !== flag) {
        if (flag) {
          await Glean.onUploadEnabled();
        } else {
          await Glean.onUploadDisabled();
        }
      }
    });
  }

  /**
   * Sets the `logPings` flag.
   *
   * When this flag is `true` pings will be logged to the console right before they are collected.
   *
   * @param flag Whether or not to log pings.
   */
  static setLogPings(flag: boolean): void {
    Glean.dispatcher.launch(() => {
      // It is guaranteed that _config will have a value here.
      //
      // All dispatched tasks are guaranteed to be run after initialize.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      if (!Glean.instance._config!.debug) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        Glean.instance._config!.debug = {};
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      Glean.instance._config!.debug.logPings = flag;

      // The dispatcher requires that dispatched functions return promises.
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

    await Glean.dispatcher.testBlockOnQueue();
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
    Glean.instance._initialized = false;

    // Deregiter all plugins
    testResetEvents();

    // Clear the dispatcher queue and return the dispatcher back to an uninitialized state.
    await Glean.dispatcher.testUninitialize();

    // Stop ongoing jobs and clear pending pings queue.
    await Glean.pingUploader.clearPendingPingsQueue();
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
      await Glean.eventsDatabase.clearAll();
      await Glean.metricsDatabase.clearAll();
      await Glean.pingsDatabase.clearAll();
    } catch {
      // Nothing to do here.
      // It is expected that these will fail in case we are initializing Glean for the first time.
    }

    // Re-Initialize Glean.
    await Glean.testInitialize(applicationId, uploadEnabled, config);
  }
}

export default Glean;
