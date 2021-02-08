/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CLIENT_INFO_STORAGE, KNOWN_CLIENT_ID } from "./constants";
import { Configuration, ConfigurationInterface } from "config";
import MetricsDatabase from "metrics/database";
import PingsDatabase from "pings/database";
import PingUploader from "upload";
import { isUndefined, sanitizeApplicationId } from "utils";
import { CoreMetrics } from "internal_metrics";
import { Lifetime } from "metrics";
import EventsDatabase from "metrics/events_database";
import UUIDMetricType from "metrics/types/uuid";
import DatetimeMetricType, { DatetimeMetric } from "metrics/types/datetime";
import Dispatcher from "dispatcher";

class Glean {
  // The Glean singleton.
  private static _instance?: Glean;

  // The metrics and pings databases.
  private _db: {
    metrics: MetricsDatabase,
    events: EventsDatabase,
    pings: PingsDatabase
  }
  // Whether or not Glean has been initialized.
  private _initialized: boolean;
  // Instances of Glean's core metrics.
  private _coreMetrics: CoreMetrics;
  // The ping uploader.
  private _pingUploader: PingUploader
  // A task dispatcher to help execute in order asynchronous external API calls.
  private _dispatcher: Dispatcher;

  // Properties that will only be set on `initialize`.

  // The application ID (will be sanitized during initialization).
  private _applicationId?: string;
  // Whether or not to record metrics.
  private _uploadEnabled?: boolean;
  // The Glean configuration object.
  private _config?: Configuration;

  private constructor() {
    if (!isUndefined(Glean._instance)) {
      throw new Error(
        `Tried to instantiate Glean through \`new\`.
        Use Glean.instance instead to access the Glean singleton.`);
    }

    this._dispatcher = new Dispatcher();
    this._pingUploader = new PingUploader();
    this._coreMetrics = new CoreMetrics();
    this._initialized = false;
    this._db = {
      metrics: new MetricsDatabase(),
      events: new EventsDatabase(),
      pings: new PingsDatabase(this._pingUploader)
    };
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
    // e.g. we start Glean for the first with tupload disabled.
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
    if (Glean.instance._initialized) {
      console.warn("Attempted to initialize Glean, but it has already been initialized. Ignoring.");
      return;
    }

    if (applicationId.length === 0) {
      throw new Error("Unable to initialize Glean, applicationId cannot be an empty string.");
    }

    // The configuration constructor will throw in case config has any incorrect prop.
    const correctConfig = new Configuration(config);

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
            // Temporarily enable uploading so we can submit a
            // deletion request ping.
            Glean.uploadEnabled = true;
            await Glean.onUploadDisabled();
          }
        } else {
          await Glean.clearMetrics();
        }
      }

      Glean.instance._initialized = true;

      await Glean.pingUploader.scanPendingPings();

      // Even though this returns a promise, there is no need to block on it returning.
      //
      // On the contrary we _want_ the dispatcher to execute tasks async.
      void Glean.pingUploader.triggerUpload();
    });
  }

  /**
   * Gets this Glean's instance metrics database.
   *
   * @returns This Glean's instance metrics database.
   */
  static get metricsDatabase(): MetricsDatabase {
    return Glean.instance._db.metrics;
  }

  /**
   * Gets this Glean's instance events database.
   *
   * @returns This Glean's instance events database.
   */
  static get eventsDatabase(): EventsDatabase {
    return Glean.instance._db.events;
  }


  /**
   * Gets this Glean's instance pings database.
   *
   * @returns This Glean's instance pings database.
   */
  static get pingsDatabase(): PingsDatabase {
    return Glean.instance._db.pings;
  }

  /**
   * Gets this Glean's instance initialization status.
   *
   * @returns Whether or not the Glean singleton has been initialized.
   */
  static get initialized(): boolean {
    return Glean.instance._initialized;
  }

  /**
   * Gets this Glean's instance application id.
   *
   * @returns The application id or `undefined` in case Glean has not been initialized yet.
   */
  static get applicationId(): string | undefined {
    return Glean.instance._applicationId;
  }

  /**
   * Gets this Glean's instance server endpoint.
   *
   * @returns The server endpoint or `undefined` in case Glean has not been initialized yet.
   */
  static get serverEndpoint(): string | undefined {
    return Glean.instance._config?.serverEndpoint;
  }

  /**
   * Gets this Gleans's instance dispatcher.
   *
   * @returns The dispatcher instance.
   */
  static get dispatcher(): Dispatcher {
    return Glean.instance._dispatcher;
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
          `Changing upload enabled before Glean is initialized is not supported.
          Pass the correct state into \`Glean.initialize\`.
          See documentation at https://mozilla.github.io/glean/book/user/general-api.html#initializing-the-glean-sdk`
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
   * **Test-only API**
   *
   * Resets the Glean to an uninitialized state.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   */
  static async testUninitialize(): Promise<void> {
    // Get back to an uninitialized state.
    Glean.instance._initialized = false;

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
  static async testResetGlean(applicationId: string, uploadEnabled = true, config?: Configuration): Promise<void> {
    await Glean.testUninitialize();

    // Clear the databases.
    await Glean.eventsDatabase.clearAll();
    await Glean.metricsDatabase.clearAll();
    await Glean.pingsDatabase.clearAll();

    // Re-Initialize Glean.
    Glean.initialize(applicationId, uploadEnabled, config);

    await Glean.dispatcher.testBlockOnQueue();
  }
}

export default Glean;
