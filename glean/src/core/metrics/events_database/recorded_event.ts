/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { JSONObject } from "../../utils.js";
import type { MetricValidationResult } from "../metric.js";

import { GLEAN_RESERVED_EXTRA_KEYS } from "../../constants.js";
import { isBoolean, isNumber, isString, isInteger, isObject } from "../../utils.js";
import { MetricValidation, Metric } from "../metric.js";
import { validateString } from "../utils.js";

export type ExtraValues = string | boolean | number;
// A helper type for the 'extra' map.
export type ExtraMap = Record<string, ExtraValues>;

export interface Event extends JSONObject {
  // The event's category.
  //
  // This is defined by users in the metrics file.
  readonly category: string,
  // The event's name.
  //
  // This is defined by users in the metrics file.
  readonly name: string,
  // The timestamp of when the event was recorded.
  //
  // This allows to order events.
  readonly timestamp: number,
  // A map of all extra data values.
  //
  // The set of allowed extra keys is defined by users in the metrics file.
  extra?: ExtraMap,
}

// Represents the recorded data for a single event.
export class RecordedEvent extends Metric<Event, Event> {
  constructor(v: unknown) {
    super(v);
  }

  private static withTransformedExtras(
    e: Event,
    transformFn: (extras: ExtraMap) => ExtraMap
  ): Event {
    const extras = e.extra || {};
    const transformedExtras = transformFn(extras);
    return {
      category: e.category,
      name: e.name,
      timestamp: e.timestamp,
      extra: (transformedExtras && Object.keys(transformedExtras).length > 0)
        ? transformedExtras : undefined
    };
  }

  /**
   * Add another extra key to a RecordedEvent object.
   *
   * @param key The key to add.
   * @param value The value of the key.
   */
  addExtra(key: string, value: ExtraValues): void {
    if (!this.inner.extra) {
      this.inner.extra = {};
    }

    this.inner.extra[key] = value;
  }

  /**
   * Generate a new Event object,
   * stripped of Glean reserved extra keys.
   *
   * @returns A new Event object.
   */
  withoutReservedExtras(): Event {
    return RecordedEvent.withTransformedExtras(
      this.get(),
      (extras: ExtraMap): ExtraMap => {
        return Object.keys(extras)
          .filter(key => !GLEAN_RESERVED_EXTRA_KEYS.includes(key))
          .reduce((obj: ExtraMap, key) => {
            obj[key] = extras[key];
            return obj;
          }, {});
      }
    );
  }

  validate(v: unknown): MetricValidationResult {
    // The expected object here is the Event object, which may have 3 or 4 properties.
    if (!isObject(v)) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Expected Glean event object, got ${typeof v}`
      };
    }

    const categoryValidation = "category" in v && isString(v.category);
    const nameValidation = "name" in v && isString(v.name);
    if (!categoryValidation || !nameValidation) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Unexpected value for "category" or "name" in event object: ${JSON.stringify(v)}`
      };
    }

    const timestampValidation = "timestamp" in v && isInteger(v.timestamp) && v.timestamp >= 0;
    if (!timestampValidation) {
      return {
        type: MetricValidation.Error,
        errorMessage: `Event timestamp must be a positive integer, got ${JSON.stringify(v)}`
      };
    }

    if (v.extra) {
      if (!isObject(v.extra)) {
        return {
          type: MetricValidation.Error,
          errorMessage: `Expected Glean extras object, got ${typeof v}`
        };
      }

      for (const [key, value] of Object.entries(v.extra)) {
        const validation = validateString(key);
        if (validation.type === MetricValidation.Error) {
          return validation;
        }

        if (!isString(value) && !isNumber(value) && !isBoolean(value)) {
          return {
            type: MetricValidation.Error,
            errorMessage: `Unexpected value for extra key ${key}: ${JSON.stringify(value)}`
          };
        }
      }
    }

    return { type: MetricValidation.Success };
  }

  /**
   * Generate a new Event object,
   * in the format expected on ping payloads.
   *
   * Strips reserved extra keys
   * and stringifies all event extras.
   *
   * @returns A new RecordedEvent object.
   */
  payload(): Event {
    return RecordedEvent.withTransformedExtras(
      this.withoutReservedExtras(),
      (extras: ExtraMap): ExtraMap => {
        return Object.keys(extras)
          .reduce((extra: Record<string, string>, key) => {
            extra[key] = extras[key].toString();
            return extra;
          }, {});
      }
    );
  }
}
