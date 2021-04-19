/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { DELETION_REQUEST_PING_NAME } from "../constants.js";
import { generateUUIDv4 } from "../utils.js";
import collectAndStorePing from "../pings/maker.js";
import type CommonPingData from "./common_ping_data.js";
import { Context } from "../context.js";

/**
 * Stores information about a ping.
 *
 * This is required so that given metric data queued on disk we can send
 * pings with the correct settings, e.g. whether it has a client_id.
 */
class PingType implements CommonPingData {
  readonly name: string;
  readonly includeClientId: boolean;
  readonly sendIfEmpty: boolean;
  readonly reasonCodes: string[];

  constructor (meta: CommonPingData) {
    this.name = meta.name;
    this.includeClientId = meta.includeClientId;
    this.sendIfEmpty = meta.sendIfEmpty;
    this.reasonCodes = meta.reasonCodes ?? [];
  }

  private isDeletionRequest(): boolean {
    return this.name === DELETION_REQUEST_PING_NAME;
  }

  /**
   * Collects and submits a ping for eventual uploading.
   *
   * The ping content is assembled as soon as possible, but upload is not
   * guaranteed to happen immediately, as that depends on the upload policies.
   *
   * If the ping currently contains no content, it will not be sent,
   * unless it is configured to be sent if empty.
   *
   * @param reason The reason the ping was triggered. Included in the
   *               `ping_info.reason` part of the payload.
   */
  submit(reason?: string): void {
    Context.dispatcher.launch(async () => {
      if (!Context.initialized) {
        console.info("Glean must be initialized before submitting pings.");
        return;
      }

      if (!Context.uploadEnabled && !this.isDeletionRequest()) {
        console.info("Glean disabled: not submitting pings. Glean may still submit the deletion-request ping.");
        return;
      }

      let correctedReason = reason;
      if (reason && !this.reasonCodes.includes(reason)) {
        console.error(`Invalid reason code ${reason} from ${this.name}. Ignoring.`);
        correctedReason = undefined;
      }

      const identifier = generateUUIDv4();
      await collectAndStorePing(identifier, this, correctedReason);
      return;
    });
  }
}

export default PingType;
