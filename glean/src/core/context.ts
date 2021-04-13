/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type MetricsDatabase from "./metrics/database";

/**
 * TODO: Why do we need this?
 */
export class Context {
  private static _instance: Context;

  private _uploadEnabled!: boolean;
  private _metricsDatabase!: MetricsDatabase;

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

  get metricsDatabase(): MetricsDatabase {
    return this._metricsDatabase;
  }

  set metricsDatabase(db: MetricsDatabase) {
    this._metricsDatabase = db;
  }

  get uploadEnabled(): boolean {
    return this._uploadEnabled;
  }

  set uploadEnabled(upload: boolean) {
    this._uploadEnabled = upload;
  }
}
