/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { DebugOptions } from "./debug_options";
import type Dispatcher from "./dispatcher";
import type MetricsDatabase from "./metrics/database";
import type EventsDatabase from "./metrics/events_database";
import type PingsDatabase from "./pings/database";

/**
 * TODO: Why do we need this?
 */
export class Context {
  private static _instance: Context;

  private _dispatcher!: Dispatcher;

  private _uploadEnabled!: boolean;
  private _metricsDatabase!: MetricsDatabase;
  private _eventsDatabase!: EventsDatabase;
  private _pingsDatabase!: PingsDatabase;

  private _applicationId!: string;
  private _initialized!: boolean;

  private _debugOptions!: DebugOptions;

  private constructor() {
    // Intentionally empty, exclusively defined to mark the
    // constructor as private.
  }

  static get instance(): Context {
    if (!Context._instance) {
      Context._instance = new Context();
    }

    return Context._instance;
  }

  static get dispatcher(): Dispatcher {
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
