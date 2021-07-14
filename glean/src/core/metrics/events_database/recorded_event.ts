/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GLEAN_RESERVED_EXTRA_KEYS } from "../../constants.js";
import type { JSONObject } from "../../utils.js";

// An helper type for the 'extra' map.
export type ExtraMap = Record<string, string>;

// Represents the recorded data for a single event.
export class RecordedEvent {
  constructor(
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
    public extra?: ExtraMap,
  ) {}

  static toJSONObject(e: RecordedEvent): JSONObject {
    return {
      "category": e.category,
      "name": e.name,
      "timestamp": e.timestamp,
      "extra": e.extra,
    };
  }

  static fromJSONObject(e: JSONObject): RecordedEvent {
    return new RecordedEvent(
      e["category"] as string,
      e["name"] as string,
      e["timestamp"] as number,
      e["extra"] as ExtraMap | undefined
    );
  }

  /**
   * Add another extra key to a RecordedEvent object.
   *
   * @param key The key to add.
   * @param value The value of the key.
   */
  addExtra(key: string, value: string): void {
    if (!this.extra) {
      this.extra = {};
    }

    this.extra[key] = value;
  }

  /**
   * Generate a new RecordedEvent object,
   * stripped of Glean reserved extra keys.
   *
   * @returns A new RecordedEvent object.
   */
  withoutReservedExtras(): RecordedEvent {
    const extras = this.extra || {};
    const filteredExtras = Object.keys(extras)
      .filter(key => !GLEAN_RESERVED_EXTRA_KEYS.includes(key))
      .reduce((obj: ExtraMap, key) => {
        obj[key] = extras[key];
        return obj;
      }, {});

    return new RecordedEvent(
      this.category,
      this.name,
      this.timestamp,
      (filteredExtras && Object.keys(filteredExtras).length > 0) ? filteredExtras : undefined
    );
  }
}
