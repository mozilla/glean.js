/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { Metric } from "../metric.js";
import { isNumber } from "../../utils.js";

export class CounterMetric extends Metric<number, number> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is number {
    if (!isNumber(v)) {
      return false;
    }

    if (v <= 0) {
      return false;
    }

    return true;
  }

  payload(): number {
    return this._inner;
  }
}
