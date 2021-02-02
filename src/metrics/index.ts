/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { JSONValue } from "utils";
import Glean from "glean";
import { Task } from "dispatcher";

/**
 * The Metric class describes the shared behaviour amongst concrete metrics.
 *
 * A concrete metric will always have two possible representations:
 *
 * - `InternalRepresentation`
 *    - Is the format in which this metric will be stored in memory.
 *    - This format may contain extra metadata, in order to allow deserializing of this data for testing purposes.
 * - `PayloadRepresentation`
 *    - Is the format in which this metric will be represented in the ping payload.
 *    - This format must be the exact same as described in [the Glean schema](https://github.com/mozilla-services/mozilla-pipeline-schemas/blob/master/schemas/glean/glean/glean.1.schema.json).
 */
export abstract class Metric<
  InternalRepresentation extends JSONValue,
  PayloadRepresentation extends JSONValue
> {
  protected _inner: InternalRepresentation;

  constructor(v: unknown) {
    if (!this.validate(v)) {
      throw new Error("Unable to create new Metric instance, values is in unexpected format.");
    }

    this._inner = v;
  }

  /**
   * Gets this metrics value in its internal representation.
   *
   * @returns The metric value.
   */
  get(): InternalRepresentation {
    return this._inner;
  }

  /**
   * Sets this metrics value.
   *
   * @param v The value to set, must be in the exact internal representation of this metric.
   *
   * @throws In case the metric is not in the expected format.
   */
  set(v: unknown): void {
    if (!this.validate(v)) {
      console.error(`Unable to set metric to ${v}. Value is in unexpected format. Ignoring.`);
      return;
    }

    this._inner = v;
  }

  /**
   * Validates that a given value is in the correct format for this metrics internal representation.
   *
   * @param v The value to verify.
   *
   * @returns A special Typescript value (which compiles down to a boolean)
   *          stating whether `v` is of the correct type.
   */
  abstract validate(v: unknown): v is InternalRepresentation;

  /**
   * Gets this metrics value in its payload representation.
   *
   * @returns The metric value.
   */
  abstract payload(): PayloadRepresentation;
}

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

/**
 * A MetricType describes common behavior across all metrics.
 */
export abstract class MetricType implements CommonMetricData {
  readonly type: string;
  readonly name: string;
  readonly category?: string;
  readonly sendInPings: string[];
  readonly lifetime: Lifetime;
  readonly disabled: boolean;

  // Private list of ongoing dispatched recording tasks.
  //
  // This array will only be filled in testing mode.
  #recording: Promise<void>[];

  constructor(type: string, meta: CommonMetricData) {
    this.type = type;

    this.name = meta.name;
    this.sendInPings = meta.sendInPings;
    this.lifetime = meta.lifetime;
    this.disabled = meta.disabled;

    if (meta.category) {
      this.category = meta.category;
    }

    this.#recording = [];
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
   * Verify whether or not this metric instance should be recorded.
   *
   * @returns Whether or not this metric instance should be recorded.
   */
  shouldRecord(): boolean {
    return (Glean.isUploadEnabled() && !this.disabled);
  }

  /**
   * Dispatches a recording task to be performed asynchronously.
   *
   * If Glean is currently in testing mode the tasks are launched in canary mode
   * and it's possible to use `testWaitOnRecordingTasks` to wait on them being completed.
   *
   * @param task The recording task.
   */
  dispatchRecordingTask(task: Task): void {
    if (Glean.testing) {
      const recordingTask = Glean.dispatcher.testLaunch(task);
      this.#recording.push(recordingTask);
      return;
    }

    Glean.dispatcher.launch(task);
  }

  /**
   * **Test-only API**
   *
   * Allows the caller to block until all recording tasks related to this metric are completed.
   *
   * @returns A promise that returns once all ongoing recording tasks are completed.
   */
  protected async testBlockOnRecordingTasks(): Promise<void> {
    if (!Glean.testing) {
      console.error("Attempted to call a testing API, but Glean is not in testing mode.");
      return;
    }

    await Promise.all(this.#recording);
  }
}
