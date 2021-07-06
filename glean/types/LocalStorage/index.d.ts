/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

declare namespace LocalStorage {
  const LocalStorage = {
    openDatabaseSync(
      name: string,
      version: string,
      description: string,
      estimatedSize: number
    ): DatabaseHandle;
  };

  interface QueryResult {
    rows: QueryResultRows;
  }

  interface QueryResultRows {
    length: number;

    // The return type here is specific to Glean.js.
    // In reality, this function is able to return a generic JSONObject.
    item(index: number): { key: string, value: string };
  }

  interface DatabaseHandle {
    transaction(cb: (tx: DatabaseTransaction) => void): void;
  }

  interface DatabaseTransaction {
    executeSql(query: string): QueryResult | undefined;
  }
}
