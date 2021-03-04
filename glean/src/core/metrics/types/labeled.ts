/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { CommonMetricData, MetricType } from "..";
import Glean from "../../glean";
import CounterMetricType from "./counter";
import BooleanMetricType from "./boolean";
import StringMetricType from "./string";

const MAX_LABELS = 16;
const OTHER_LABEL = "__other__";
const MAX_LABEL_LENGTH = 61;

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
    labels?: string[],
  ) {
    return new Proxy(this, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      get: (_target: LabeledMetricType<T>, label: string): any => {
        if (labels) {
          return LabeledMetricType.createFromStaticLabel<typeof submetric>(meta, submetric, labels, label);
        }

        return LabeledMetricType.createFromDynamicLabel<typeof submetric>(meta, submetric, label);
      }
    });
  }

  /**
   * Combines a metric's base identifier and label.
   *
   * @param metricName the metric base identifier
   * @param label the label
   *
   * @returns a string representing the complete metric id including the label.
   */
  private static combineIdentifierAndLabel(
    metricName: string,
    label: string
  ): string {
    return `${metricName}/${label}`;
  }

  /**
   * Create an instance of the submetric type for the provided static label.
   *
   * @param meta the `CommonMetricData` information for the metric.
   * @param submetricClass the class type for the submetric.
   * @param allowedLabels the array of allowed labels.
   * @param label the desired label to record to.
   *
   * @returns an instance of the submetric class type that allows to record data.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static createFromStaticLabel<T extends new (...args: any) => InstanceType<T>>(
    meta: CommonMetricData,
    submetricClass: T,
    allowedLabels: string[],
    label: string
  ): T {
    // If the label was provided in the registry file, then use it. Otherwise,
    // store data in the `OTHER_LABEL`.
    const adjustedLabel = allowedLabels.includes(label) ? label : OTHER_LABEL;
    const newMeta: CommonMetricData = {
      ...meta,
      name: LabeledMetricType.combineIdentifierAndLabel(meta.name, adjustedLabel)
    };
    return new submetricClass(newMeta);
  }

  /**
   * Create an instance of the submetric type for the provided dynamic label.
   *
   * @param meta the `CommonMetricData` information for the metric.
   * @param submetricClass the class type for the submetric.
   * @param label the desired label to record to.
   *
   * @returns an instance of the submetric class type that allows to record data.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static createFromDynamicLabel<T extends new (...args: any) => InstanceType<T>>(
    meta: CommonMetricData,
    submetricClass: T,
    label: string
  ): T {
    const newMeta: CommonMetricData = {
      ...meta,
      dynamicLabel: label
    };
    return new submetricClass(newMeta);
  }

  static async getValidDynamicLabel(metric: MetricType): Promise<string> {
    // Note that we assume `metric.dynamicLabel` to always be available within this function.
    // This is a safe assumptions because we should only call `getValidDynamicLabel` if we have
    // a dynamic label.
    if (metric.dynamicLabel === undefined) {
      throw new Error("This point should never be reached.");
    }

    const key = LabeledMetricType.combineIdentifierAndLabel(metric.baseIdentifier(), metric.dynamicLabel);

    for (const ping of metric.sendInPings) {
      if (await Glean.metricsDatabase.hasMetric(metric.lifetime, ping, metric.type, key)) {
        return key;
      }
    }

    let numUsedKeys = 0;
    for (const ping of metric.sendInPings) {
      numUsedKeys += await Glean.metricsDatabase.countByBaseIdentifier(
        metric.lifetime,
        ping,
        metric.type,
        metric.baseIdentifier());
    }

    let hitError = false;
    if (numUsedKeys >= MAX_LABELS) {
      hitError = true;
    } else if (metric.dynamicLabel.length > MAX_LABEL_LENGTH) {
      console.error(`label length ${metric.dynamicLabel.length} exceeds maximum of ${MAX_LABEL_LENGTH}`);
      hitError = true;
      // TODO: record error in bug 1682574
    } else if (!LABEL_REGEX.test(metric.dynamicLabel)) {
      console.error(`label must be snake_case, got '${metric.dynamicLabel}'`);
      hitError = true;
      // TODO: record error in bug 1682574
    }

    return (hitError)
      ? LabeledMetricType.combineIdentifierAndLabel(metric.baseIdentifier(), OTHER_LABEL)
      : key;
  }
}

export default LabeledMetricType;
