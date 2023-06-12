/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type MetricsDatabase from "./metrics/database/async.js";
import type MetricsDatabaseSync from "./metrics/database/sync.js";

import type EventsDatabase from "./metrics/events_database/async.js";
import type { EventsDatabaseSync } from "./metrics/events_database/sync.js";

import type PingsDatabase from "./pings/database/async.js";
import type PingsDatabaseSync from "./pings/database/sync.js";

import type ErrorManager from "./error/async.js";
import type ErrorManagerSync from "./error/sync.js";

import type Platform from "../platform/async.js";
import type PlatformSync from "../platform/sync.js";

import type { CoreMetrics } from "./internal_metrics/async.js";
import type { CoreMetricsSync } from "./internal_metrics/sync.js";

import type { Configuration } from "./config.js";
import type CorePings from "./internal_pings.js";
import type { Metric } from "./metrics/metric.js";
import type { JSONValue } from "./utils.js";

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

  // The dispatcher is only used with the non-web (async) implementation.
  private _dispatcher: Dispatcher;

  private _platform!: Platform | PlatformSync;
  private _corePings!: CorePings;
  private _coreMetrics!: CoreMetrics | CoreMetricsSync;

  // The following group of properties are all set on Glean.initialize
  // Attempting to get them before they are set will log an error.
  private _uploadEnabled!: boolean;
  private _metricsDatabase!: MetricsDatabase | MetricsDatabaseSync;
  private _eventsDatabase!: EventsDatabase | EventsDatabaseSync;
  private _pingsDatabase!: PingsDatabase | PingsDatabaseSync;
  private _errorManager!: ErrorManager | ErrorManagerSync;
  private _applicationId!: string;
  private _config!: Configuration;

  // Whether or not Glean is initialized.
  private _initialized = false;
  // Whether or not Glean is in testing mode.
  private _testing = false;
  // A map of metric types and their constructors.
  // This map is dynamically filled every time a metric type is constructed.
  //
  // If a metric is not in this map it cannot be deserialized from the database.
  private _supportedMetrics: {
    [type: string]: new (v: unknown) => Metric<JSONValue, JSONValue>;
  } = {};

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
   * Test-only API
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
          "Attempted to access Context.uploadEnabled before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._uploadEnabled;
  }

  static set uploadEnabled(upload: boolean) {
    Context.instance._uploadEnabled = upload;
  }

  static get metricsDatabase(): MetricsDatabase | MetricsDatabaseSync {
    if (typeof Context.instance._metricsDatabase === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.metricsDatabase before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._metricsDatabase;
  }

  static set metricsDatabase(db: MetricsDatabase | MetricsDatabaseSync) {
    Context.instance._metricsDatabase = db;
  }

  static get eventsDatabase(): EventsDatabase | EventsDatabaseSync {
    if (typeof Context.instance._eventsDatabase === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.eventsDatabase before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._eventsDatabase;
  }

  static set eventsDatabase(db: EventsDatabase | EventsDatabaseSync) {
    Context.instance._eventsDatabase = db;
  }

  static get pingsDatabase(): PingsDatabase | PingsDatabaseSync {
    if (typeof Context.instance._pingsDatabase === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.pingsDatabase before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._pingsDatabase;
  }

  static set pingsDatabase(db: PingsDatabase | PingsDatabaseSync) {
    Context.instance._pingsDatabase = db;
  }

  static get errorManager(): ErrorManager | ErrorManagerSync {
    if (typeof Context.instance._errorManager === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.errorManager before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._errorManager;
  }

  static set errorManager(db: ErrorManager | ErrorManagerSync) {
    Context.instance._errorManager = db;
  }

  static get applicationId(): string {
    if (typeof Context.instance._applicationId === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.applicationId before it was set. This may cause unexpected behaviour."
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

  static get config(): Configuration {
    if (typeof Context.instance._config === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.config before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._config;
  }

  static set config(config: Configuration) {
    Context.instance._config = config;
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

  static get corePings(): CorePings {
    return Context.instance._corePings;
  }

  static set corePings(pings: CorePings) {
    Context.instance._corePings = pings;
  }

  static get coreMetrics(): CoreMetrics | CoreMetricsSync {
    return Context.instance._coreMetrics;
  }

  static set coreMetrics(metrics: CoreMetrics | CoreMetricsSync) {
    Context.instance._coreMetrics = metrics;
  }

  static set platform(platform: Platform | PlatformSync) {
    Context.instance._platform = platform;
  }

  static get platform(): Platform | PlatformSync {
    if (typeof Context.instance._platform === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.platform before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance._platform;
  }

  static isPlatformSet(): boolean {
    return !!Context.instance._platform;
  }

  static isPlatformSync(): boolean {
    return Context.instance._platform?.name === "web";
  }

  static getSupportedMetric(
    type: string
  ): (new (v: unknown) => Metric<JSONValue, JSONValue>) | undefined {
    return Context.instance._supportedMetrics[type];
  }

  /**
   * Adds a new constructor to the supported metrics map.
   *
   * If the metric map already contains this constructor, this is a no-op.
   *
   * @param type A string identifying the given metric type.
   * @param ctor The metric constructor.
   */
  static addSupportedMetric(
    type: string,
    ctor: new (v: unknown) => Metric<JSONValue, JSONValue>
  ): void {
    if (type in Context.instance._supportedMetrics) {
      return;
    }

    Context.instance._supportedMetrics[type] = ctor;
  }
}
