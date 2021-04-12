/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSONValue } from "../utils.js";

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
      console.error(`Unable to set metric to ${JSON.stringify(v)}. Value is in unexpected format. Ignoring.`);
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
