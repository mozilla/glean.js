/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { DELETION_REQUEST_PING_NAME } from "../constants.js";
import { generateUUIDv4, testOnlyCheck } from "../utils.js";
import collectAndStorePing from "../pings/maker.js";
import type CommonPingData from "./common_ping_data.js";
import { Context } from "../context.js";
import log, { LoggingLevel } from "../log.js";

const LOG_TAG = "core.Pings.PingType";

type ValidatorFunction = (reason?: string) => Promise<void>;
type PromiseCallback = (value: void | PromiseLike<void>) => void;

/**
 * Asserts whether or not a given ping is a deletion-request ping.
 *
 * @param name The ping name to check.
 * @returns Whether or not the name is the deletion-request ping name.
 */
function isDeletionRequest(name: string): boolean {
  return name === DELETION_REQUEST_PING_NAME;
}


export class InternalPingType implements CommonPingData {
  readonly name: string;
  readonly includeClientId: boolean;
  readonly sendIfEmpty: boolean;
  readonly reasonCodes: string[];

  // The functions and promises required for the test API to
  // execute and synchronize with the submission API.
  private resolveTestPromiseFunction?: PromiseCallback;
  private rejectTestPromiseFunction?: PromiseCallback;
  private testCallback?: ValidatorFunction;

  constructor (meta: CommonPingData) {
    this.name = meta.name;
    this.includeClientId = meta.includeClientId;
    this.sendIfEmpty = meta.sendIfEmpty;
    this.reasonCodes = meta.reasonCodes ?? [];
  }

  /**
   * An implemention of `submit` that does not dispatch the submission task.
   *
   * @param reason The reason the ping was triggered. Included in the
   *               `ping_info.reason` part of the payload.
   * @param testResolver The asynchronous validation function to run in order to validate
   *        the ping content.
   */
  async submitUndispatched(reason?: string, testResolver?: PromiseCallback): Promise<void> {
    if (!Context.initialized) {
      log(LOG_TAG, "Glean must be initialized before submitting pings.", LoggingLevel.Info);
      return;
    }

    if (!Context.uploadEnabled && !isDeletionRequest(this.name)) {
      log(
        LOG_TAG,
        "Glean disabled: not submitting pings. Glean may still submit the deletion-request ping.",
        LoggingLevel.Info
      );
      return;
    }

    let correctedReason = reason;
    if (reason && !this.reasonCodes.includes(reason)) {
      log(LOG_TAG, `Invalid reason code ${reason} from ${this.name}. Ignoring.`, LoggingLevel.Warn);
      correctedReason = undefined;
    }

    const identifier = generateUUIDv4();
    await collectAndStorePing(identifier, this, correctedReason);

    if (testResolver) {
      testResolver();

      // Finally clean up!
      this.resolveTestPromiseFunction = undefined;
      this.rejectTestPromiseFunction = undefined;
      this.testCallback = undefined;
    }
  }

  private internalSubmit(reason?: string, testResolver?: PromiseCallback): void {
    Context.dispatcher.launch(async () => {
      await this.submitUndispatched(reason, testResolver);
    });
  }

  submit(reason?: string): void {
    // **** Read this before changing the following code! ****
    //
    // The Dispatcher does not allow dispatched tasks to await on
    // other dispatched tasks. Unfortunately, this causes a deadlock.
    // In order to work around that problem, we kick off validation
    // right before the actual submission takes place, through another
    // async function (and not through the dispatcher). After validation
    // is complete, regardless of the outcome, the ping submission is
    // finally triggered.
    if (this.testCallback) {
      this.testCallback(reason)
        .then(() => {
          this.internalSubmit(reason, this.resolveTestPromiseFunction);
        })
        .catch(e => {
          log(
            LOG_TAG,
            [`There was an error validating "${this.name}" (${reason ?? "no reason"}):`, e],
            LoggingLevel.Error
          );
          this.internalSubmit(reason, this.rejectTestPromiseFunction);
        });
    } else {
      this.internalSubmit(reason);
    }
  }

  async testBeforeNextSubmit(callbackFn: ValidatorFunction): Promise<void> {
    if (testOnlyCheck("testBeforeNextSubmit", LOG_TAG)) {
      if (this.testCallback) {
        log(
          LOG_TAG,
          `There is an existing test call for ping "${this.name}". Ignoring.`,
          LoggingLevel.Error
        );
        return;
      }

      return new Promise((resolve, reject) => {
        this.resolveTestPromiseFunction = resolve;
        this.rejectTestPromiseFunction = reject;
        this.testCallback = callbackFn;
      });
    }
  }
}

/**
 * Stores information about a ping.
 *
 * This is required so that given metric data queued on disk we can send
 * pings with the correct settings, e.g. whether it has a client_id.
 */
export default class {
  #inner: InternalPingType;

  constructor(meta: CommonPingData) {
    this.#inner = new InternalPingType(meta);
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
    this.#inner.submit(reason);
  }

  /**
   * Test-only API
   *
   * Runs a validation function before the ping is collected.
   *
   * @param callbackFn The asynchronous validation function to run in order to validate
   *        the ping content.
   * @returns A `Promise` resolved when the ping is collected and the validation function
   *          is executed.
   */
  async testBeforeNextSubmit(callbackFn: ValidatorFunction): Promise<void> {
    return this.#inner.testBeforeNextSubmit(callbackFn);
  }
}
