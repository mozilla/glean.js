/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Metric } from "../metric.js";
import { isString } from "../../utils.js";

export const MAX_LENGTH_VALUE = 100;

export class StringMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is string {
    if (!isString(v)) {
      return false;
    }

    if (v.length > MAX_LENGTH_VALUE) {
      return false;
    }

    return true;
  }

  payload(): string {
    return this._inner;
  }
}
