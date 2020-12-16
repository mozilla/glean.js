/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import Glean from "glean";

/**
 * An enum representing the possible metric lifetimes.
 */
export const enum Lifetime {
  // The metric is reset with each sent ping
  Ping = "ping",
  // The metric is reset on application restart
  Application = "application",
  // The metric is reset with each user profile
  User = "user",
}

/**
 * The common set of data shared across all different metric types.
 */
export interface CommonMetricData {
  // The metric's name.
  readonly name: string,
  // The metric's category.
  readonly category?: string,
  // List of ping names to include this metric in.
  readonly sendInPings: string[],
  // The metric's lifetime.
  readonly lifetime: Lifetime,
  // Whether or not the metric is disabled.
  //
  // Disabled metrics are never recorded.
  readonly disabled: boolean
}

class Metric implements CommonMetricData {
  readonly type: string;
  readonly name: string;
  readonly category?: string;
  readonly sendInPings: string[];
  readonly lifetime: Lifetime;
  readonly disabled: boolean;

  constructor(type: string, meta: CommonMetricData) {
    this.type = type;

    this.name = meta.name;
    this.sendInPings = meta.sendInPings;
    this.lifetime = meta.lifetime;
    this.disabled = meta.disabled;

    if (meta.category) {
      this.category = meta.category;
    }
  }

  /**
   * This metric's unique identifier, including the category and name.
   *
   * @returns The generated identifier.
   */
  get identifier(): string {
    if (this.category) {
      return `${this.category}.${this.name}`;
    } else {
      return this.name;
    }
  }

  /**
   * Verify if whether or not this metric instance should be recorded to a given Glean instance.
   *
   * @returns Whether or not this metric instance should be recorded.
   */
  shouldRecord(): boolean {
    return (Glean.uploadEnabled && !this.disabled);
  }
}

export default Metric;
