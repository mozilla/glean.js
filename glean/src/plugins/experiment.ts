/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Plugin from "./index.js";
import type { PingInfo } from "../core/pings/ping_payload.js";
import type { JSONObject } from "../core/utils.js";
import { truncateStringAtBoundaryWithError } from "../core/utils.js";
import CoreEvents from "../core/events/index.js";
import { Context } from "../core/context";
import ExperimentMetricType, { ExperimentMetric, ExperimentData } from "../core/metrics/types/experiment";
import {Lifetime} from "../core/metrics/lifetime";
import log, { LoggingLevel } from "../core/log.js";
import { ErrorType } from "../core/error/error_type";
import { PING_INFO_STORAGE } from "../core/constants";
import experiment from "../core/metrics/types/experiment";

const LOG_TAG = "plugin.ExperimentPlugin";
const MAX_EXPERIMENTS_IDS_LEN = 100;
const MAX_EXPERIMENT_VALUE_LEN = MAX_EXPERIMENTS_IDS_LEN;
const MAX_EXPERIMENTS_EXTRAS_SIZE = 20;
/**
 * A plugin that listens for the `afterPingInfoCollection` event
 *
 * This plugin will modify the schema of outgoing pings to:
 *
 * ```json
 * To be determined
 * ```
 */
class ExperimentPlugin extends Plugin<typeof CoreEvents["afterPingInfoCollection"]> {
  /**
   * Creates a new ExperimentPlugin instance.
   */
  constructor() {
    super(CoreEvents["afterPingInfoCollection"].name, "experimentPlugin");
  }

  async setExperimentActive(metric: ExperimentMetricType, branch: string, extra?: {[key: string]: string}): Promise<void> {
    if (!metric.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    // Make sure that branch id is within the expected limit.
    let truncated_branch = branch;
    if (branch.length > MAX_EXPERIMENTS_IDS_LEN) {
      truncated_branch = await truncateStringAtBoundaryWithError(metric, branch, MAX_EXPERIMENTS_IDS_LEN);
    }

    // Make sure that extra is within the expected limit.
    let truncated_extras = extra;
    if (extra != null && Object.keys(extra).length > MAX_EXPERIMENTS_EXTRAS_SIZE) {
      const msg = `Extra hash map length ${Object.keys(extra).length} exceeds maximum of ${MAX_EXPERIMENTS_EXTRAS_SIZE}`;
      await Context.errorManager.record(metric, ErrorType.InvalidValue, msg);

      const temp: {[key: string]: string} = {};
      for (const [key, value] of Object.entries(extra).slice(0, MAX_EXPERIMENTS_EXTRAS_SIZE)) {
        const truncated_key = (key.length <= MAX_EXPERIMENTS_IDS_LEN) ? key : await truncateStringAtBoundaryWithError(metric, key, MAX_EXPERIMENTS_IDS_LEN);
        temp[truncated_key] = (value.length <= MAX_EXPERIMENT_VALUE_LEN) ? value : await truncateStringAtBoundaryWithError(metric, value, MAX_EXPERIMENT_VALUE_LEN);
      }
      truncated_extras = temp;
    }

    const value = new ExperimentMetric({ truncated_branch, truncated_extras });
    await Context.metricsDatabase.record(metric, value);
  }

  async setExperimentInactive(metric: ExperimentMetricType) {
    if (!metric.shouldRecord(Context.uploadEnabled)) {
      return;
    }

    try {
      await Context.metricsDatabase.clear(Lifetime.Application, metric.name);
    } catch (e) {
      log(
        LOG_TAG,
        `Failed to set experiment as inactive ${e}`,
        LoggingLevel.Error
      )
    }
  }

  async action(ping_info: PingInfo, experiment_data: ExperimentData): Promise<JSONObject> {
    const metric = new ExperimentMetricType({
      category: "",
      name: `${ping_info.seq}#experiment_data`,  // Not sure if this is a good idea.
      sendInPings: [PING_INFO_STORAGE],
      lifetime: Lifetime.User,
      disabled: false
    });
    await this.setExperimentActive(metric, experiment_data.branch, experiment_data.extra);
    ping_info.experiment_data = experiment_data;
    return ping_info;
  }
}

export default ExperimentPlugin;
