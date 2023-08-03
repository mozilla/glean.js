/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData, MetricType } from "../index.js";
import type CounterMetricType from "./counter.js";
import type BooleanMetricType from "./boolean.js";
import type StringMetricType from "./string.js";
import type { JSONValue } from "../../utils.js";
import type { MetricValidationResult } from "../metric.js";
import type ErrorManagerSync from "../../error/sync.js";
import type MetricsDatabaseSync from "../database/sync.js";

import { Metric, MetricValidation } from "../metric.js";
import { Context } from "../../context.js";
import { ErrorType } from "../../error/error_type.js";

/**
 * This is an internal metric representation for labeled metrics.
 *
 * This can be used to instruct the validators to simply report
 * whatever is stored internally, without performing any specific
 * validation.
 */
export class LabeledMetric extends Metric<JSONValue, JSONValue> {
  constructor(v: unknown) {
    super(v);
  }

  validate(_v: unknown): MetricValidationResult {
    return { type: MetricValidation.Success };
  }

  payload(): JSONValue {
    return this.inner;
  }
}

const MAX_LABELS = 16;
const MAX_LABEL_LENGTH = 61;
export const OTHER_LABEL = "__other__";

// ** IMPORTANT **
// When changing this documentation or the regex, be sure to change the same code
// in the Glean SDK repository as well.
//
// This regex is used for matching against labels and should allow for dots,
// underscores, and/or hyphens. Labels are also limited to starting with either
// a letter or an underscore character.
//
// Some examples of good and bad labels:
//
// Good:
// * `this.is.fine`
// * `this_is_fine_too`
// * `this.is_still_fine`
// * `thisisfine`
// * `_.is_fine`
// * `this.is-fine`
// * `this-is-fine`
// Bad:
// * `this.is.not_fine_due_tu_the_length_being_too_long_i_thing.i.guess`
// * `1.not_fine`
// * `this.$isnotfine`
// * `-.not_fine`
const LABEL_REGEX = /^[a-z_][a-z0-9_-]{0,29}(\.[a-z_][a-z0-9_-]{0,29})*$/;

/**
 * Combines a metric's base identifier and label.
 *
 * @param metricName the metric base identifier
 * @param label the label
 * @returns a string representing the complete metric id including the label.
 */
export function combineIdentifierAndLabel(metricName: string, label: string): string {
  return `${metricName}/${label}`;
}

/**
 * Strips the label from a metric identifier.
 *
 * This is a no-op in case the identifier does not contain a label.
 *
 * @param identifier The identifier to strip a label from.
 * @returns The identifier without the label.
 */
export function stripLabel(identifier: string): string {
  return identifier.split("/")[0];
}

/**
 * Checks if the dynamic label stored in the metric data is
 * valid. If not, record an error and store data in the "__other__"
 * label.
 *
 * @param metric the metric to record to.
 * @returns a valid label that can be used to store data.
 */
export async function getValidDynamicLabel(metric: MetricType): Promise<string> {
  // Note that we assume `metric.dynamicLabel` to always be available within this function.
  // This is a safe assumptions because we should only call `getValidDynamicLabel` if we have
  // a dynamic label.
  if (metric.dynamicLabel === undefined) {
    throw new Error("This point should never be reached.");
  }

  const key = combineIdentifierAndLabel(metric.baseIdentifier(), metric.dynamicLabel);

  for (const ping of metric.sendInPings) {
    if (await Context.metricsDatabase.hasMetric(metric.lifetime, ping, metric.type, key)) {
      return key;
    }
  }

  let numUsedKeys = 0;
  for (const ping of metric.sendInPings) {
    numUsedKeys += await Context.metricsDatabase.countByBaseIdentifier(
      metric.lifetime,
      ping,
      metric.type,
      metric.baseIdentifier()
    );
  }

  let hitError = false;
  if (numUsedKeys >= MAX_LABELS) {
    hitError = true;
  } else if (metric.dynamicLabel.length > MAX_LABEL_LENGTH) {
    hitError = true;
    await Context.errorManager.record(
      metric,
      ErrorType.InvalidLabel,
      `Label length ${metric.dynamicLabel.length} exceeds maximum of ${MAX_LABEL_LENGTH}.`
    );
  } else if (!LABEL_REGEX.test(metric.dynamicLabel)) {
    hitError = true;
    await Context.errorManager.record(
      metric,
      ErrorType.InvalidLabel,
      `Label must be snake_case, got '${metric.dynamicLabel}'.`
    );
  }

  return hitError ? combineIdentifierAndLabel(metric.baseIdentifier(), OTHER_LABEL) : key;
}

/**
 * Checks if the dynamic label stored in the metric data is
 * valid. If not, record an error and store data in the "__other__"
 * label.
 *
 * @param metric the metric to record to.
 * @returns a valid label that can be used to store data.
 */
export function getValidDynamicLabelSync(metric: MetricType): string {
  // Note that we assume `metric.dynamicLabel` to always be available within this function.
  // This is a safe assumptions because we should only call `getValidDynamicLabel` if we have
  // a dynamic label.
  if (metric.dynamicLabel === undefined) {
    throw new Error("This point should never be reached.");
  }

  const key = combineIdentifierAndLabel(metric.baseIdentifier(), metric.dynamicLabel);

  for (const ping of metric.sendInPings) {
    if (
      (Context.metricsDatabase as MetricsDatabaseSync).hasMetric(
        metric.lifetime,
        ping,
        metric.type,
        key
      )
    ) {
      return key;
    }
  }

  let numUsedKeys = 0;
  for (const ping of metric.sendInPings) {
    numUsedKeys += (Context.metricsDatabase as MetricsDatabaseSync).countByBaseIdentifier(
      metric.lifetime,
      ping,
      metric.type,
      metric.baseIdentifier()
    );
  }

  let hitError = false;
  if (numUsedKeys >= MAX_LABELS) {
    hitError = true;
  } else if (metric.dynamicLabel.length > MAX_LABEL_LENGTH) {
    hitError = true;
    (Context.errorManager as ErrorManagerSync).record(
      metric,
      ErrorType.InvalidLabel,
      `Label length ${metric.dynamicLabel.length} exceeds maximum of ${MAX_LABEL_LENGTH}.`
    );
  } else if (!LABEL_REGEX.test(metric.dynamicLabel)) {
    hitError = true;
    (Context.errorManager as ErrorManagerSync).record(
      metric,
      ErrorType.InvalidLabel,
      `Label must be snake_case, got '${metric.dynamicLabel}'.`
    );
  }

  return hitError ? combineIdentifierAndLabel(metric.baseIdentifier(), OTHER_LABEL) : key;
}

type SupportedLabeledTypes = CounterMetricType | BooleanMetricType | StringMetricType;

class LabeledMetricType<T extends SupportedLabeledTypes> {
  // Define an index signature to make the Proxy aware of the expected return type.
  // Note that this is required because TypeScript does not allow different input and
  // output types in Proxy (https://github.com/microsoft/TypeScript/issues/20846).
  [label: string]: T;

  constructor(
    meta: CommonMetricData,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    submetric: new (...args: any) => T,
    labels?: string[]
  ) {
    return new Proxy(this, {
      get: (_target: LabeledMetricType<T>, label: string): T => {
        if (labels) {
          return LabeledMetricType.createFromStaticLabel(meta, submetric, labels, label);
        }

        return LabeledMetricType.createFromDynamicLabel(meta, submetric, label);
      }
    });
  }

  /**
   * Create an instance of the submetric type for the provided static label.
   *
   * @param meta the `CommonMetricData` information for the metric.
   * @param submetricClass the class type for the submetric.
   * @param allowedLabels the array of allowed labels.
   * @param label the desired label to record to.
   * @returns an instance of the submetric class type that allows to record data.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static createFromStaticLabel<T extends new (...args: any) => InstanceType<T>>(
    meta: CommonMetricData,
    submetricClass: T,
    allowedLabels: string[],
    label: string
  ): InstanceType<T> {
    // If the label was provided in the registry file, then use it. Otherwise,
    // store data in the `OTHER_LABEL`.
    const adjustedLabel = allowedLabels.includes(label) ? label : OTHER_LABEL;
    const newMeta: CommonMetricData = {
      ...meta,
      name: combineIdentifierAndLabel(meta.name, adjustedLabel)
    };
    return new submetricClass(newMeta);
  }

  /**
   * Create an instance of the submetric type for the provided dynamic label.
   *
   * @param meta the `CommonMetricData` information for the metric.
   * @param submetricClass the class type for the submetric.
   * @param label the desired label to record to.
   * @returns an instance of the submetric class type that allows to record data.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static createFromDynamicLabel<T extends new (...args: any) => InstanceType<T>>(
    meta: CommonMetricData,
    submetricClass: T,
    label: string
  ): InstanceType<T> {
    const newMeta: CommonMetricData = {
      ...meta,
      dynamicLabel: label
    };
    return new submetricClass(newMeta);
  }
}

export default LabeledMetricType;
