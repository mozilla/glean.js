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
// Since we cannot have nesting in SQL databases,
// we will have a database with only two columns: `key` and `value`.
// The `key` column will contain the StorageIndex as a string, joined by SEPARATOR.
//
// !IMPORTANT! This separator cannot be "." or "#" because these values
// are already used as separators for label and category in other places of the code.
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
  if (!queryResult) {
    return {};
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
  private initialized: Promise<unknown>;

  constructor(
    private tableName: string,
    private name: string = DATABASE_NAME,
    clear = false
  ) {
    const startQueries = [];

    if (clear) {
      startQueries.push(this._executeQuery(`DROP TABLE ${tableName};`));
    }

    startQueries.push(
      // Initialize the database.
      this._executeQuery(
        `CREATE TABLE IF NOT EXISTS ${tableName}(key VARCHAR(255), value VARCHAR(255));`
      ),
      // This allows for `REPLACE ITEM` to work.
      // See: https://www.sqlitetutorial.net/sqlite-replace-statement/
      this._executeQuery(`CREATE UNIQUE INDEX IF NOT EXISTS idx ON ${tableName}(key);`),
    );

    this.initialized = Promise.all(startQueries);
  }

  private _createKeyFromIndex(index: StorageIndex) {
    return index.join(SEPARATOR);
  }

  private _getDbHandle(): LocalStorage.DatabaseHandle {
    return LocalStorage.LocalStorage.openDatabaseSync(
      this.name, "1.0", `${this.name} Storage`, 1000000
    );
  }

  protected _executeQuery(query: string): Promise<LocalStorage.QueryResult | undefined> {
    const handle = this._getDbHandle();

    return new Promise((resolve, reject) => {
      try {
        handle.transaction((tx: LocalStorage.DatabaseTransaction): void => {
          const result = tx.executeSql(query);
          resolve(result);
        });
      } catch (e) {
        log(
          LOG_TAG,
          [`Error executing LocalStorage query: ${query}.\n`, e],
          LoggingLevel.Error
        );
        reject();
      }
    });
  }

  async _executeOnceInitialized(query: string): Promise<LocalStorage.QueryResult | undefined> {
    await this.initialized;
    return this._executeQuery(query);
  }

  async _getFullResultObject(index: StorageIndex): Promise<JSONObject | undefined> {
    const key = this._createKeyFromIndex(index);
    const result = await this._executeOnceInitialized(
      `SELECT * FROM ${this.tableName} WHERE key LIKE "${key}%"`
    );
    return queryResultToJSONObject(result);
  }

  async _getWholeStore(): Promise<JSONObject> {
    const result = await this._executeOnceInitialized(`SELECT * FROM ${this.tableName}`);
    return queryResultToJSONObject(result) || {};
  }

  async get(index: StorageIndex): Promise<JSONValue | undefined> {
    const obj = (await this._getFullResultObject(index)) || {};
    return getValueFromNestedObject(obj, index);
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
      await this._executeOnceInitialized(
        `REPLACE INTO ${this.tableName}(key, value) VALUES('${key}', '${value.replace("'", "''")}');`
      );
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
