/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import MetricsDatabase from "metrics/database";
import PingsDatabase from "pings/database";
import { isUndefined, sanitizeApplicationId } from "utils";

/**
 * The Glean configuration.
 */
interface Configuration {
  // The application ID (will be sanitized during initialization).
  applicationId: string,
}

class Glean {
  // The Glean singleton.
  private static _instance?: Glean;

  // The metrics and pings databases.
  private _db: {
    metrics: MetricsDatabase,
    pings: PingsDatabase
  }
  // Whether or not to record metrics.
  private _uploadEnabled: boolean;
  // The time the Glean object was initialized.
  private _startTime: Date;
  // Whether or not Glean has been initialized.
  private _initialized: boolean;

  // Properties that will only be set on `initialize`.
  private _applicationId?: string;

  private constructor() {
    if (!isUndefined(Glean._instance)) {
      throw new Error(
        `Tried to instantiate Glean through \`new\`.
        Use Glean.instance instead to access the Glean singleton.`);
    }

    this._startTime = new Date();
    this._initialized = false;
    this._db = {
      metrics: new MetricsDatabase(),
      pings: new PingsDatabase()
    };
    // Temporarily setting this to true always, until Bug 1677444 is resolved.
    this._uploadEnabled = true;
  }

  private static get instance(): Glean {
    if (!Glean._instance) {
      Glean._instance = new Glean();
    }

    return Glean._instance;
  }

  /**
   * Initialize Glean. This method should only be called once, subsequent calls will be no-op.
   *
   * @param config The Glean configuration.
   */
  static initialize(config: Configuration): void {
    if (Glean.instance._initialized) {
      console.warn("Attempted to initialize Glean, but it has already been initialized. Ignoring.");
      return;
    }

    Glean.instance._applicationId = sanitizeApplicationId(config.applicationId);
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

  // TODO: Make the following functions `private` once Bug 1682769 is resolved.
  static get uploadEnabled(): boolean {
    return Glean.instance._uploadEnabled;
  }

  static set uploadEnabled(value: boolean) {
    Glean.instance._uploadEnabled = value;
  }

  /**
   * Gets the time this Glean instance was created.
   *
   * @returns The Date object representing the time this Glean instance was created.
   */
  static get startTime(): Date {
    return Glean.instance._startTime;
  }

  static get applicationId(): string | undefined {
    if (!Glean.instance._initialized) {
      console.error("Attempted to access the Glean.applicationId before Glean was initialized.");
    }

    return Glean.instance._applicationId;
  }

  /**
   * **Test-only API**
   *
   * Resets the Glean singleton to its initial state.
   *
   * TODO: Only allow this function to be called on test mode (depends on Bug 1682771).
   */
  static async testRestGlean(): Promise<void> {
    // Reset upload enabled state, not to inerfere with other tests.
    Glean.uploadEnabled = true;
    // Clear the databases.
    await Glean.metricsDatabase.clearAll();
    await Glean.pingsDatabase.clearAll();
  }
}

export default Glean;
