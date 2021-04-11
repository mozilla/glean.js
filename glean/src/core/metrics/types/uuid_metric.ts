/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { validate as UUIDvalidate } from "uuid";
import { KNOWN_CLIENT_ID } from "../../constants.js";
import { Metric } from "../metric.js";
import { isString } from "../../utils.js";

export class UUIDMetric extends Metric<string, string> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is string {
    if (!isString(v)) {
      return false;
    }

    if (v === KNOWN_CLIENT_ID) {
      return true;
    }

    return UUIDvalidate(v);
  }

  payload(): string {
    return this._inner;
  }
}
