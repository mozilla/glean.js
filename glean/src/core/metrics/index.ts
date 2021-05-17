/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSONValue } from "../utils.js";
import type { Lifetime } from "./lifetime.js";
import type MetricsDatabase from "./database.js";
import type { ErrorType } from "../error/error_type.js";
import { isUndefined } from "../utils.js";
import { getValidDynamicLabel } from "./types/labeled.js";
import { Context } from "../context.js";

export interface Metrics {
  [aMetricType: string]: {
    [aMetricIdentifier: string]: JSONValue;
  };
}


/**
 * The common set of data shared across all different metric types.
 */
export interface CommonMetricData {
  // The metric's name.
  readonly name: string,
  // The metric's category.
  readonly category: string,
  // List of ping names to include this metric in.
  readonly sendInPings: string[],
  // The metric's lifetime.
  readonly lifetime: Lifetime | string,
  // Whether or not the metric is disabled.
  //
  // Disabled metrics are never recorded.
  readonly disabled: boolean,
  // Dynamic label.
  //
  // When a labeled metric factory creates the specific metric to be recorded to,
  // dynamic labels are stored in the metadata so that we can validate them when
  // the Glean singleton is available (because metrics can be recorded before Glean
  // is initialized).
  dynamicLabel?: string
}

/**
 * A MetricType describes common behavior across all metrics.
 */
export abstract class MetricType implements CommonMetricData {
  readonly type: string;
  readonly name: string;
  readonly category: string;
  readonly sendInPings: string[];
  readonly lifetime: Lifetime;
  readonly disabled: boolean;
  dynamicLabel?: string;

  constructor(type: string, meta: CommonMetricData) {
    this.type = type;

    this.name = meta.name;
    this.category = meta.category;
    this.sendInPings = meta.sendInPings;
    this.lifetime = meta.lifetime as Lifetime;
    this.disabled = meta.disabled;
    this.dynamicLabel = meta.dynamicLabel;
  }

  /**
   * The metric's base identifier, including the category and name, but not the label.
   *
   * @returns The generated identifier. If `category` is empty, it's ommitted. Otherwise,
   *          it's the combination of the metric's `category` and `name`.
   */
  baseIdentifier(): string {
    if (this.category.length > 0) {
      return `${this.category}.${this.name}`;
    } else {
      return this.name;
    }
  }

  /**
   * The metric's unique identifier, including the category, name and label.
   *
   * @param metricsDatabase The metrics database.
   *
   * @returns The generated identifier. If `category` is empty, it's ommitted. Otherwise,
   *          it's the combination of the metric's `category`, `name` and `label`.
   */
  async identifier(metricsDatabase: MetricsDatabase): Promise<string> {
    const baseIdentifier = this.baseIdentifier();

    // We need to use `isUndefined` and cannot use `(this.dynamicLabel)` because we want
    // empty strings to propagate as dynamic labels, so that erros are potentially recorded.
    if (!isUndefined(this.dynamicLabel)) {
      return await getValidDynamicLabel(metricsDatabase, this);
    } else {
      return baseIdentifier;
    }
  }

  /**
   * Verify whether or not this metric instance should be recorded.
   *
   * @param uploadEnabled Whether or not global upload is enabled or
   *        disabled.
   *
   * @returns Whether or not this metric instance should be recorded.
   */
  shouldRecord(uploadEnabled: boolean): boolean {
    return (uploadEnabled && !this.disabled);
  }

  /**
   * Returns the number of errors recorded for the given metric.
   *
   * @param errorType The type of the error recorded.
   * @param ping represents the name of the ping to retrieve the metric for.
   *        Defaults to the first value in `sendInPings`.
   *
   * @returns the number of errors recorded for the metric.
   */
  async testGetNumRecordedErrors(errorType: string, ping: string = this.sendInPings[0]): Promise<number> {
    return Context.errorManager.testGetNumRecordedErrors(this, errorType as ErrorType, ping);
  }
}
