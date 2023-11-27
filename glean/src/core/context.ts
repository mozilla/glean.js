/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type MetricsDatabase from "./metrics/database.js";
import type EventsDatabase from "./metrics/events_database/index.js";
import type PingsDatabase from "./pings/database.js";
import type ErrorManager from "./error/index.js";
import type Platform from "../platform/index.js";
import type { CoreMetrics } from "./internal_metrics.js";

import type { Configuration } from "./config.js";
import type CorePings from "./internal_pings.js";
import type { Metric } from "./metrics/metric.js";
import type { JSONValue } from "./utils.js";

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

  private platform!: Platform;
  private corePings!: CorePings;
  private coreMetrics!: CoreMetrics;

  // The following group of properties are all set on Glean.initialize
  // Attempting to get them before they are set will log an error.
  private uploadEnabled!: boolean;
  private metricsDatabase!: MetricsDatabase;
  private eventsDatabase!: EventsDatabase;
  private pingsDatabase!: PingsDatabase;
  private errorManager!: ErrorManager;
  private applicationId!: string;
  private config!: Configuration;

  // Whether or not Glean is initialized.
  private initialized = false;
  // Whether or not Glean is in testing mode.
  private testing = false;
  // A map of metric types and their constructors.
  // This map is dynamically filled every time a metric type is constructed.
  //
  // If a metric is not in this map it cannot be deserialized from the database.
  private supportedMetrics: {
    [type: string]: new (v: unknown) => Metric<JSONValue, JSONValue>;
  } = {};

  // The moment the current Glean.js session started.
  private startTime: Date;

  private constructor() {
    this.startTime = new Date();
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

  static get uploadEnabled(): boolean {
    if (typeof Context.instance.uploadEnabled === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.uploadEnabled before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance.uploadEnabled;
  }

  static set uploadEnabled(upload: boolean) {
    Context.instance.uploadEnabled = upload;
  }

  static get metricsDatabase(): MetricsDatabase {
    if (typeof Context.instance.metricsDatabase === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.metricsDatabase before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance.metricsDatabase;
  }

  static set metricsDatabase(db: MetricsDatabase) {
    Context.instance.metricsDatabase = db;
  }

  static get eventsDatabase(): EventsDatabase {
    if (typeof Context.instance.eventsDatabase === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.eventsDatabase before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance.eventsDatabase;
  }

  static set eventsDatabase(db: EventsDatabase) {
    Context.instance.eventsDatabase = db;
  }

  static get pingsDatabase(): PingsDatabase {
    if (typeof Context.instance.pingsDatabase === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.pingsDatabase before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance.pingsDatabase;
  }

  static set pingsDatabase(db: PingsDatabase) {
    Context.instance.pingsDatabase = db;
  }

  static get errorManager(): ErrorManager {
    if (typeof Context.instance.errorManager === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.errorManager before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance.errorManager;
  }

  static set errorManager(db: ErrorManager) {
    Context.instance.errorManager = db;
  }

  static get applicationId(): string {
    if (typeof Context.instance.applicationId === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.applicationId before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance.applicationId;
  }

  static set applicationId(id: string) {
    Context.instance.applicationId = id;
  }

  static get initialized(): boolean {
    return Context.instance.initialized;
  }

  static set initialized(init: boolean) {
    Context.instance.initialized = init;
  }

  static get config(): Configuration {
    if (typeof Context.instance.config === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.config before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance.config;
  }

  static set config(config: Configuration) {
    Context.instance.config = config;
  }

  static get startTime(): Date {
    return Context.instance.startTime;
  }

  static get testing(): boolean {
    return Context.instance.testing;
  }

  static set testing(flag: boolean) {
    Context.instance.testing = flag;
  }

  static get corePings(): CorePings {
    return Context.instance.corePings;
  }

  static set corePings(pings: CorePings) {
    Context.instance.corePings = pings;
  }

  static get coreMetrics(): CoreMetrics {
    return Context.instance.coreMetrics;
  }

  static set coreMetrics(metrics: CoreMetrics) {
    Context.instance.coreMetrics = metrics;
  }

  static set platform(platform: Platform) {
    Context.instance.platform = platform;
  }

  static get platform(): Platform {
    if (typeof Context.instance.platform === "undefined") {
      log(
        LOG_TAG,
        [
          "Attempted to access Context.platform before it was set. This may cause unexpected behaviour."
        ],
        LoggingLevel.Trace
      );
    }

    return Context.instance.platform;
  }

  static isPlatformSet(): boolean {
    return !!Context.instance.platform;
  }

  static getSupportedMetric(
    type: string
  ): (new (v: unknown) => Metric<JSONValue, JSONValue>) | undefined {
    return Context.instance.supportedMetrics[type];
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
    if (type in Context.instance.supportedMetrics) {
      return;
    }

    Context.instance.supportedMetrics[type] = ctor;
  }
}
