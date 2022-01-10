/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { StorageIndex } from "../../core/storage/index.js";
import type Store from "../../core/storage/index.js";
import type { JSONObject, JSONValue } from "../../core/utils.js";
import { getValueFromNestedObject, updateNestedObject } from "../../core/storage/utils.js";
import { isObject, isUndefined } from "../../core/utils.js";
import log, { LoggingLevel } from "../../core/log.js";

const LOG_TAG = "platform.qt.Storage";
// The name of the file that will hold the SQLite database.
const DATABASE_NAME = "Glean";
// Estimated size of database file.
// This estimate is calculated by (rounding off and)
// doubling the 95th percentile  of glean-core's database size on Android (150Kb).
// https://glam.telemetry.mozilla.org/fenix/probe/glean_database_size/explore?app_id=release&timeHorizon=ALL
const ESTIMATED_DATABASE_SIZE = 150 * 2 * 10**3; // 300Kb in bytes
// Since we cannot have nesting in SQL databases,
// we will have a database with only two columns: `key` and `value`.
// The `key` column will contain the StorageIndex as a string, joined by SEPARATOR.
//
// !IMPORTANT! This separator cannot be ".", "#" or "/" because these values
// are already used as separators for label, category and inside internal metric names
// (e.g. sequence numbers) in other places of the code.
const SEPARATOR = "+";

/**
 * Gets an object and return an array of [ key, value ] arrays
 * where `key` and `value` are the actual values to store in SQLite.
 *
 * @param value The object to transform in a key value array
 * @param index _These argument is only relevant for the subsequent recursive calls. Ignore._
 * @param result _These argument is only relevant for the subsequent recursive calls. Ignore._
 * @returns The key value array generated.
 */
function getKeyValueArrayFromNestedObject(
  value: JSONValue,
  index = "",
  result: string[][] = []
): string[][] {
  if (isObject(value)) {
    const keys = Object.keys(value);
    for (const key of keys) {
      const target = value[key];
      if (!isUndefined(target)) {
        getKeyValueArrayFromNestedObject(target, `${index}${key}${SEPARATOR}`, result);
      }
    }
  } else {
    result.push([index.slice(0, -1), JSON.stringify(value)]);
  }

  return result;
}

/**
 * Gets a QtQuick.LocalStorage result and transforms it into a JSONObject.
 *
 * @param queryResult The query result to transform.
 * @returns The resulting JSONObject.
 */
function queryResultToJSONObject(
  queryResult: LocalStorage.QueryResult | undefined
): JSONObject | undefined {
  if (!queryResult || queryResult.rows.length === 0) {
    return;
  }

  const obj: JSONObject = {};
  for (let i = 0; i < queryResult.rows.length; i++) {
    const item = queryResult.rows.item(i);
    const index = item.key.split(SEPARATOR);

    let target = obj;
    for (const key of index.slice(0, -1)) {
      if (isUndefined(target[key])) {
        target[key] = {};
      }

      // Typescript throws an error below about not being able to
      // set target to target[key] because it may not be a JSONObject.
      // We make sure by the above conditional that target[key] is a JSONObject,
      // thus we can safely ignore Typescripts concerns.
      //
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      target = target[key];
    }

    try {
      target[index[index.length - 1]] = JSON.parse(item.value) as JSONValue;
    } catch(e) {
      target[index[index.length - 1]] = item.value;
    }
  }

  return obj;
}

class QMLStore implements Store {
  protected initialized: Promise<unknown>;
  private dbHandle?: LocalStorage.DatabaseHandle;
  private logTag: string;

  constructor(
    private tableName: string,
    private name: string = DATABASE_NAME
  ) {
    const logTag = `${LOG_TAG}.${tableName}`;
    this.initialized = this._executeQuery(
      `CREATE TABLE IF NOT EXISTS ${tableName}(key VARCHAR(255), value VARCHAR(255));`,
      logTag
    );

    this.logTag = logTag;
  }

  private _createKeyFromIndex(index: StorageIndex) {
    return index.join(SEPARATOR);
  }

  /**
   * Best effort at getting the database handle.
   *
   * @param logTag The logTag to add to log messages.
   *        Having this as an argument is necessary for the case when this
   *        function gets called before initialize. In that case `this` is `undefined`
   *        and attempting to call `this.logTag` will throw an error.
   * @returns The database handle or `undefined`.
   */
  private _dbHandle(logTag?: string): LocalStorage.DatabaseHandle | undefined {
    try {
      const handle = LocalStorage.LocalStorage.openDatabaseSync(
        this.name, "1.0", `${this.name} Storage`, ESTIMATED_DATABASE_SIZE
      );
      this.dbHandle = handle;
    } catch(e) {
      log(
        logTag || this.logTag,
        ["Error while attempting to access LocalStorage.\n", e],
        LoggingLevel.Debug
      );
    } finally {
      return this.dbHandle;
    }
  }

  /**
   * Executes an arbitrary query on the database.
   *
   * @param query The query to execute.
   * @param logTag The logTag to add to log messages.
   *        Having this as an argument is necessary for the case when this
   *        function gets called before initialize. In that case `this` is `undefined`
   *        and attempting to call `this.logTag` will throw an error.
   * @returns The query result if succesfull. A rejection otherwise.
   */
  protected _executeQuery(query: string, logTag?: string): Promise<LocalStorage.QueryResult | undefined> {
    const handle = this._dbHandle(logTag);
    if (!handle) {
      return Promise.reject();
    }

    return new Promise((resolve, reject) => {
      try {
        handle.transaction((tx: LocalStorage.DatabaseTransaction): void => {
          const result = tx.executeSql(query);
          resolve(result);
        });
      } catch (e) {
        log(
          logTag || this.logTag,
          [`Error executing LocalStorage query: ${query}.\n`, e],
          LoggingLevel.Debug
        );
        reject();
      }
    });
  }

  protected async _executeOnceInitialized(query: string): Promise<LocalStorage.QueryResult | undefined> {
    await this.initialized;
    return this._executeQuery(query);
  }

  private async _getFullResultObject(index: StorageIndex): Promise<JSONObject | undefined> {
    const key = this._createKeyFromIndex(index);
    const result = await this._executeOnceInitialized(
      `SELECT * FROM ${this.tableName} WHERE key LIKE "${key}%"`
    );
    return queryResultToJSONObject(result);
  }

  private async _getWholeStore(): Promise<JSONObject | undefined> {
    const result = await this._executeOnceInitialized(`SELECT * FROM ${this.tableName}`);
    return queryResultToJSONObject(result);
  }

  async get(index: StorageIndex = []): Promise<JSONValue | undefined> {
    if (index.length === 0) {
      return this._getWholeStore();
    }

    const obj = (await this._getFullResultObject(index)) || {};
    try {
      return getValueFromNestedObject(obj, index);
    } catch(e) {
      log(this.logTag, ["Error getting value from database.", e]);
    }
  }

  async update(
    index: StorageIndex,
    transformFn: (v?: JSONValue | undefined) => JSONValue
  ): Promise<void> {
    const result = (await this._getFullResultObject(index)) || {};
    const transformedResult = updateNestedObject(result, index, transformFn);
    const updates = getKeyValueArrayFromNestedObject(transformedResult);
    for (const update of updates) {
      const [ key, value ] = update;
      const escapedValue = value.replace("'", "''");
      const updateResult = await this._executeOnceInitialized(
        `UPDATE ${this.tableName} SET value='${escapedValue}' WHERE key='${key}'`
      );

      if (!updateResult?.rows.length) {
        await this._executeOnceInitialized(
          `INSERT INTO ${this.tableName}(key, value) VALUES('${key}', '${escapedValue}');`
        );
      }
    }
  }

  async delete(index: StorageIndex): Promise<void> {
    const key = this._createKeyFromIndex(index);
    await this._executeOnceInitialized(
      `DELETE FROM ${this.tableName} WHERE key LIKE "${key}%"`
    );
  }
}

export default QMLStore;
