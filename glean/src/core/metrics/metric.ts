/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSONValue } from "../utils.js";
import type { MetricType } from "./index.js";
import { Context } from "../context.js";
import { ErrorType } from "../error/error_type.js";

export enum MetricValidation {
  Success,
  Error
}

export type MetricValidationResult =
  { type: MetricValidation.Success } |
  { type: MetricValidation.Error, errorMessage: string, errorType?: ErrorType };

export class MetricValidationError extends Error {
  constructor(message?: string, readonly type = ErrorType.InvalidType) {
    super(message);
    try {
      this.name = "MetricValidationError";
    } catch {
      // This fails in Qt.
      // See https://bugreports.qt.io/browse/QTBUG-101298
    }
  }

  async recordError(metric: MetricType) {
    await Context.errorManager.record(metric, this.type, this.message);
  }
}

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
    this._inner = this.validateOrThrow(v);
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
   * @param v The value to set.
   */
  set(v: InternalRepresentation): void {
    this._inner = v;
  }

  /**
   * Validates a given value using the validation function and throws in case it is not valid.
   *
   * @param v The value to verify.
   * @returns `v` if it is valid.
   */
  validateOrThrow(v: unknown): InternalRepresentation {
    const validation = this.validate(v);
    if (validation.type === MetricValidation.Error) {
      throw new MetricValidationError(validation.errorMessage, validation.errorType);
    }

    // This is safe, we have just validated the type above.
    return v as InternalRepresentation;
  }

  /**
   * Validates that a given value is in the correct format for this metrics internal representation.
   *
   * # Note
   *
   * This function should only check for validations
   * that would prevent a metric from being recorded.
   *
   * @param v The value to verify.
   * @returns Whether or not validation was successfull.
   */
  abstract validate(v: unknown): MetricValidationResult;

  /**
   * Gets this metrics value in its payload representation.
   *
   * @returns The metric value.
   */
  abstract payload(): PayloadRepresentation;
}
