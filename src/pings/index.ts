/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { DELETION_REQUEST_PING_NAME } from "../constants";
import { generateUUIDv4 } from "utils";
import collectAndStorePing from "pings/maker";
import Glean from "glean";

/**
 * Stores information about a ping.
 *
 * This is required so that given metric data queued on disk we can send
 * pings with the correct settings, e.g. whether it has a client_id.
 */
class PingType {
  /**
   * Creates a new ping type for the given name,
   * whether to include the client ID and whether to send this ping empty.
   *
   * @param name  The name of the ping.
   * @param includeClientId Whether to include the client ID in the assembled ping when submitting.
   * @param sendIfEmtpy Whether the ping should be sent empty or not.
   * @param reasonCodes Optional. The valid reason codes for this ping.
   */
  constructor (
    readonly name: string,
    readonly includeClientId: boolean,
    readonly sendIfEmtpy: boolean,
    readonly reasonCodes: string[] = []
  ) {}

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
    Glean.dispatcher.launch(async () => {
      if (!Glean.initialized) {
        console.info("Glean must be initialized before submitting pings.");
        return;
      }

      if (!Glean.isUploadEnabled() && !this.isDeletionRequest()) {
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
