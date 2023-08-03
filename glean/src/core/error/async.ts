/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { MetricType } from "../metrics/index.js";
import type { ErrorType } from "./error_type.js";
import type { IErrorManager } from "./shared.js";

import log from "../log.js";
import { createLogTag, getErrorMetricForMetric } from "./shared.js";

// See `IErrorManager` for method documentation.
export default class ErrorManager implements IErrorManager {
  async record(
    metric: MetricType,
    error: ErrorType,
    message: unknown,
    numErrors = 1
  ): Promise<void> {
    const errorMetric = getErrorMetricForMetric(metric, error);
    log(createLogTag(metric), [`${metric.baseIdentifier()}:`, message]);
    if (numErrors > 0) {
      await errorMetric.addUndispatched(numErrors);
    }
  }

  async testGetNumRecordedErrors(
    metric: MetricType,
    error: ErrorType,
    ping?: string
  ): Promise<number> {
    const errorMetric = getErrorMetricForMetric(metric, error);
    const numErrors = await errorMetric.testGetValue(ping);
    return numErrors || 0;
  }
}
