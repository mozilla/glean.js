/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { DebugOptions } from "./debug_options.js";
import type MetricsDatabase from "./metrics/database.js";
import type EventsDatabase from "./metrics/events_database/index.js";
import type PingsDatabase from "./pings/database.js";
import type ErrorManager from "./error/index.js";
import type Platform from "../platform/index.js";
import Dispatcher from "./dispatcher.js";
import log, { LoggingLevel } from "./log.js";

const LOG_TAG = "core.Context";

/**
 * This class holds all of the Glean singleton's state and internal dependencies.
 *
 * It is necessary so that internal modules don't need to import Glean directly.
 * Doing that should be avoided at all costs because that singleton imports
 * most of our internal modules by value. That causes bad circular dependency issues,
 * due to the module being imported by Glean and also importing Glean.
 *
 * This singleton breaks the cycle, by serving as a bridge between the Glean singleton
 * and the internal modules. All of the imports in this file should be `import type`
 * which only matter for Typescript and don't cause circular dependency issues.
 */
export class Context {
  private static _instance?: Context;

  private _dispatcher: Dispatcher;
  private _platform!: Platform;

  // The following group of properties are all set on Glean.initialize
  // Attempting to get them before they are set will log an error.
  private _uploadEnabled!: boolean;
  private _metricsDatabase!: MetricsDatabase;
  private _eventsDatabase!: EventsDatabase;
  private _pingsDatabase!: PingsDatabase;
  private _errorManager!: ErrorManager;
  private _applicationId!: string;
  private _debugOptions!: DebugOptions;

  // Whether or not Glean is initialized.
  private _initialized = false;
  // Whether or not Glean is in testing mode.
  private _testing = false;

  // The moment the current Glean.js session started.
  private _startTime: Date;

  private constructor() {
    this._startTime = new Date();
    this._dispatcher = new Dispatcher();
  }

  static get instance(): Context {
    if (!Context._instance) {
      Context._instance = new Context();
    }

    return Context._instance;
  }

  /**
   * Test-only API**
   *
   * Resets the Context to an uninitialized state.
   */
  static testUninitialize(): void {
    Context._instance = undefined;
  }

  static get dispatcher(): Dispatcher {
    return Context.instance._dispatcher;
  }

  static get uploadEnabled(): boolean {
    if (typeof Context.instance._uploadEnabled === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.uploadEnabled before it was set. This may cause unexpected behaviour.",
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._uploadEnabled;
  }

  static set uploadEnabled(upload: boolean) {
    Context.instance._uploadEnabled = upload;
  }

  static get metricsDatabase(): MetricsDatabase {
    if (typeof Context.instance._metricsDatabase === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.metricsDatabase before it was set. This may cause unexpected behaviour.",
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._metricsDatabase;
  }

  static set metricsDatabase(db: MetricsDatabase) {
    Context.instance._metricsDatabase = db;
  }

  static get eventsDatabase(): EventsDatabase {
    if (typeof Context.instance._eventsDatabase === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.eventsDatabase before it was set. This may cause unexpected behaviour.",
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._eventsDatabase;
  }

  static set eventsDatabase(db: EventsDatabase) {
    Context.instance._eventsDatabase = db;
  }

  static get pingsDatabase(): PingsDatabase {
    if (typeof Context.instance._pingsDatabase === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.pingsDatabase before it was set. This may cause unexpected behaviour.",
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._pingsDatabase;
  }

  static set pingsDatabase(db: PingsDatabase) {
    Context.instance._pingsDatabase = db;
  }

  static get errorManager(): ErrorManager {
    if (typeof Context.instance._errorManager === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.errorManager before it was set. This may cause unexpected behaviour.",
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._errorManager;
  }

  static set errorManager(db: ErrorManager) {
    Context.instance._errorManager = db;
  }

  static get applicationId(): string {
    if (typeof Context.instance._applicationId === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.applicationId before it was set. This may cause unexpected behaviour.",
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._applicationId;
  }

  static set applicationId(id: string) {
    Context.instance._applicationId = id;
  }

  static get initialized(): boolean {
    return Context.instance._initialized;
  }

  static set initialized(init: boolean) {
    Context.instance._initialized = init;
  }

  static get debugOptions(): DebugOptions {
    if (typeof Context.instance._debugOptions === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.debugOptions before it was set. This may cause unexpected behaviour.",
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._debugOptions;
  }

  static set debugOptions(options: DebugOptions) {
    Context.instance._debugOptions = options;
  }

  static get startTime(): Date {
    return Context.instance._startTime;
  }

  static get testing(): boolean {
    return Context.instance._testing;
  }

  static set testing(flag: boolean) {
    Context.instance._testing = flag;
  }

  static set platform(platform: Platform) {
    Context.instance._platform = platform;
  }

  static get platform(): Platform {
    if (typeof Context.instance._platform === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.platform before it was set. This may cause unexpected behaviour.",
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._platform;
  }
}
