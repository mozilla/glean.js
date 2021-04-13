/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { CommonMetricData } from "../index.js";
import type CounterMetricType from "./counter.js";
import type BooleanMetricType from "./boolean.js";
import type StringMetricType from "./string.js";
import { combineIdentifierAndLabel, OTHER_LABEL } from "./labeled_utils.js";

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
   *
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
   *
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
