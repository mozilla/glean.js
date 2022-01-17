/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index";
import { MetricType } from "../index";
import { Metric } from "../metric.js";
import { isObject, isString, JSONObject } from "../../utils.js";


export interface ExperimentData extends JSONObject {
  branch: string,
  extra?: {[key: string]: string}
}

export class ExperimentMetric extends Metric<ExperimentData, ExperimentData> {
  constructor(v: unknown) {
    super(v);
  }

  validate(v: unknown): v is ExperimentData {
    if (!isObject(v) || Object.keys(v).length !== 2) {
      return false;
    }

    const branchVerification = "branch" in v && isString(v.branch);
    const extraVerification = "extra" in v && this.validateDict(v.extra);

    return branchVerification && extraVerification
  }

  validateDict(extra: unknown) {
    if (!isObject(extra)) {
      return false;
    }

    for (const key in Object.keys(extra)) {
      if(!isString(extra[key])) {
        return false;
      }
    }
    return true;
  }

  payload(): ExperimentData {
    return {
      branch: this._inner.branch,
      extra: this._inner.extra
    };
  }
}

class ExperimentMetricType extends MetricType {
  constructor(meta: CommonMetricData) {
    super("experiment", meta, ExperimentMetric);
  }
}

export default ExperimentMetricType;
