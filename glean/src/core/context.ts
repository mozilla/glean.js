/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { DebugOptions } from "./debug_options";
import Dispatcher from "./dispatcher";
import type MetricsDatabase from "./metrics/database";
import type EventsDatabase from "./metrics/events_database";
import type PingsDatabase from "./pings/database";

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
  private static _instance: Context;

  private _dispatcher!: Dispatcher | null;

  private _uploadEnabled!: boolean;
  private _metricsDatabase!: MetricsDatabase;
  private _eventsDatabase!: EventsDatabase;
  private _pingsDatabase!: PingsDatabase;

  private _applicationId!: string;
  private _initialized: boolean;

  private _debugOptions!: DebugOptions;

  private constructor() {
    this._initialized = false;
  }

  static get instance(): Context {
    if (!Context._instance) {
      Context._instance = new Context();
    }

    return Context._instance;
  }

  /**
   * **Test-only API**
   *
   * Resets the Context to an uninitialized state.
   */
  static async testUninitialize(): Promise<void> {
    // Clear the dispatcher queue and return the dispatcher back to an uninitialized state.
    if (Context.instance._dispatcher) {
      await Context.instance._dispatcher.testUninitialize();
    }

    Context.instance._dispatcher = null;
    Context.initialized = false;
  }

  static get dispatcher(): Dispatcher {
    // Create a dispatcher if one isn't available already.
    // This is required since the dispatcher may be used
    // earlier than Glean initialization, so we can't rely
    // on `Glean.initialize` to set it.
    if (!Context.instance._dispatcher) {
      Context.instance._dispatcher = new Dispatcher();
    }

    return Context.instance._dispatcher;
  }

  static set dispatcher(dispatcher: Dispatcher) {
    Context.instance._dispatcher = dispatcher;
  }

  static get uploadEnabled(): boolean {
    return Context.instance._uploadEnabled;
  }

  static set uploadEnabled(upload: boolean) {
    Context.instance._uploadEnabled = upload;
  }

  static get metricsDatabase(): MetricsDatabase {
    return Context.instance._metricsDatabase;
  }

  static set metricsDatabase(db: MetricsDatabase) {
    Context.instance._metricsDatabase = db;
  }

  static get eventsDatabase(): EventsDatabase {
    return Context.instance._eventsDatabase;
  }

  static set eventsDatabase(db: EventsDatabase) {
    Context.instance._eventsDatabase = db;
  }

  static get pingsDatabase(): PingsDatabase {
    return Context.instance._pingsDatabase;
  }

  static set pingsDatabase(db: PingsDatabase) {
    Context.instance._pingsDatabase = db;
  }

  static get applicationId(): string {
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
    return Context.instance._debugOptions;
  }

  static set debugOptions(options: DebugOptions) {
    Context.instance._debugOptions = options;
  }
}
