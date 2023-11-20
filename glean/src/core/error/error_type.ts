/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * The possible error types for metric recording.
 */
export enum ErrorType {
  // For when the value to be recorded does not match the metric-specific restrictions
  InvalidValue = "invalid_value",
  // For when the label of a labeled metric does not match the restrictions
  InvalidLabel = "invalid_label",
  // For when the metric caught an invalid state while recording
  InvalidState = "invalid_state",
  // For when the value to be recorded overflows the metric-specific upper range
  InvalidOverflow = "invalid_overflow",
  // For when the value passed to a recording function is not of the correct type.
  InvalidType = "invalid_type",
}
