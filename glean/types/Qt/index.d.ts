/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This file was created from the template offered on the TS website:
// https://www.typescriptlang.org/docs/handbook/declaration-files/templates/global-d-ts.html

declare namespace Qt {
  interface Locale {
    name: string;
  }

  interface Platform {
    os: string;
  }

  const platform: Platform;

  function locale(): Locale | undefined;
}
