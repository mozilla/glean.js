/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CLIENT_INFO_STORAGE, DEFAULT_TELEMETRY_ENDPOINT, KNOWN_CLIENT_ID } from "./constants";
import Configuration from "config";
import MetricsDatabase from "metrics/database";
import PingsDatabase from "pings/database";
import PingUploader from "upload";
import { isUndefined, sanitizeApplicationId } from "utils";
import { CoreMetrics } from "internal_metrics";
import { Lifetime } from "metrics";
import { DatetimeMetric } from "metrics/types/datetime";

class Glean {
  // The Glean singleton.
  private static _instance?: Glean;

  // The metrics and pings databases.
  private _db: {
    metrics: MetricsDatabase,
    pings: PingsDatabase
  }
  // Whether or not Glean has been initialized.
  private _initialized: boolean;
  // Instances of Glean's core metrics.
  private _coreMetrics: CoreMetrics;
  // The ping uploader.
  private _pingUploader: PingUploader

  // Properties that will only be set on `initialize`.

  // The application ID (will be sanitized during initialization).
  private _applicationId?: string;
  // The server pings are sent to.
  private _serverEndpoint?: URL;
  // Whether or not to record metrics.
  private _uploadEnabled?: boolean;

  private constructor() {
    if (!isUndefined(Glean._instance)) {
      throw new Error(
        `Tried to instantiate Glean through \`new\`.
        Use Glean.instance instead to access the Glean singleton.`);
    }

    this._pingUploader = new PingUploader();
    this._coreMetrics = new CoreMetrics();
    this._initialized = false;
    this._db = {
      metrics: new MetricsDatabase(),
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
    // Stop ongoing uploading jobs and clear pending pings queue.
    await Glean.pingUploader.clearPendingPingsQueue();

    // There is only one metric that we want to survive after clearing all
    // metrics: first_run_date. Here, we store its value
    // so we can restore it after clearing the metrics.
    //
    // TODO: This may throw an exception. Bug 1687475 will resolve this.
    const existingFirstRunDate = new DatetimeMetric(
      await Glean.metricsDatabase.getMetric(
        CLIENT_INFO_STORAGE,
        Glean.coreMetrics.firstRunDate
      )
    );

    // Clear the databases.
    await Glean.metricsDatabase.clearAll();
    await Glean.pingsDatabase.clearAll();

    // We need to briefly set upload_enabled to true here so that `set`
    // is not a no-op.
    //
    // Note that we can't provide the same guarantees as glean-core here.
    // If by any change another actor attempts to record a metric while
    // we are setting the known client id and first run date, they will be allowed to.
    //
    // TODO: Bug 1687491 might resolve this issue.
    Glean.uploadEnabled = true;

    // Store a "dummy" KNOWN_CLIENT_ID in the client_id metric. This will
    // make it easier to detect if pings were unintentionally sent after
    // uploading is disabled.
    await Glean.coreMetrics.clientId.set(KNOWN_CLIENT_ID);

    // Restore the first_run_date.
    await Glean.coreMetrics.firstRunDate.set(existingFirstRunDate.date);

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
   *                      If disabled, all persisted metrics, events and queued pings (except
   *                      first_run_date) are cleared.
   * @param config Glean configuration options.
   */
  static async initialize(
    applicationId: string,
    uploadEnabled: boolean,
    config?: Configuration
  ): Promise<void> {
    if (Glean.instance._initialized) {
      console.warn("Attempted to initialize Glean, but it has already been initialized. Ignoring.");
      return;
    }

    if (applicationId.length === 0) {
      throw new Error("Unable to initialize Glean, applicationId cannot be an empty string.");
    }
    Glean.instance._applicationId = sanitizeApplicationId(applicationId);

    Glean.instance._serverEndpoint = config
      ? config.serverEndpoint : new URL(DEFAULT_TELEMETRY_ENDPOINT);

    if (uploadEnabled) {
      await Glean.onUploadEnabled();
    } else {
      await Glean.onUploadDisabled();
    }

    Glean.instance._initialized = true;

    await Glean.pingUploader.scanPendingPings();
    // Even though this returns a promise, there is no need to block on it returning.
    Glean.pingUploader.triggerUpload();
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

  static get applicationId(): string | undefined {
    if (!Glean.instance._initialized) {
      console.warn("Attempted to access the Glean.applicationId before Glean was initialized.");
    }

    return Glean.instance._applicationId;
  }

  static get serverEndpoint(): URL | undefined {
    if (!Glean.instance._initialized) {
      console.warn("Attempted to access the Glean.serverEndpoint before Glean was initialized.");
    }

    return Glean.instance._serverEndpoint;
  }

  /**
   * Determines whether upload is enabled.
   *
   * When upload is disabled, no data will be recorded.
   *
   * @returns Whether upload is enabled.
   */
  static isUploadEnabled(): boolean {
    if (!Glean.instance._initialized) {
      console.warn("Attempted to access the Glean.uploadEnabled before Glean was initialized.");
    }

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
   *
   * @returns Whether the flag was different from the current value,
   *          and actual work was done to clear or reinstate metrics.
   */
  static async setUploadEnabled(flag: boolean): Promise<boolean> {
    if (Glean.uploadEnabled !== flag) {
      if (flag) {
        await Glean.onUploadEnabled();
      } else {
        await Glean.onUploadDisabled();
      }
      return true;
    }
    return false;
  }

  /**
   * **Test-only API**
   *
   * Resets the Glean to an uninitialized state and clear app lifetime metrics.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   */
  static async testUninitialize(): Promise<void> {
    Glean.instance._initialized = false;
    await Glean.metricsDatabase.clear(Lifetime.Application);
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
  static async testRestGlean(applicationId: string, uploadEnabled = true, config?: Configuration): Promise<void> {
    // Get back to an uninitialized state.
    Glean.instance._initialized = false;

    // Stop ongoing jobs and clear pending pings queue.
    await Glean.pingUploader.clearPendingPingsQueue();

    // Clear the databases.
    await Glean.metricsDatabase.clearAll();
    await Glean.pingsDatabase.clearAll();

    // Re-Initialize Glean.
    await Glean.initialize(applicationId, uploadEnabled, config);
  }
}

export default Glean;
