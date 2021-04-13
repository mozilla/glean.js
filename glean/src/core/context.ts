/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { DebugOptions } from "./debug_options";
import type MetricsDatabase from "./metrics/database";
import type EventsDatabase from "./metrics/events_database";
import type PingsDatabase from "./pings/database";

/**
 * TODO: Why do we need this?
 */
export class Context {
  private static _instance: Context;

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

  get uploadEnabled(): boolean {
    return this._uploadEnabled;
  }

  set uploadEnabled(upload: boolean) {
    this._uploadEnabled = upload;
  }

  get metricsDatabase(): MetricsDatabase {
    return this._metricsDatabase;
  }

  set metricsDatabase(db: MetricsDatabase) {
    this._metricsDatabase = db;
  }

  get eventsDatabase(): EventsDatabase {
    return this._eventsDatabase;
  }

  set eventsDatabase(db: EventsDatabase) {
    this._eventsDatabase = db;
  }

  get pingsDatabase(): PingsDatabase {
    return this._pingsDatabase;
  }

  set pingsDatabase(db: PingsDatabase) {
    this._pingsDatabase = db;
  }

  get applicatinId(): string {
    return this._applicationId;
  }

  set applicationId(id: string) {
    this._applicationId = id;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  set initialized(init: boolean) {
    this._initialized = init;
  }

  get debugOptions(): DebugOptions {
    return this._debugOptions;
  }

  set debugOptions(options: DebugOptions) {
    this._debugOptions = options;
  }
}
