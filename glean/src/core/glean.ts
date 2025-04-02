/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ConfigurationInterface } from "./config.js";
import type Platform from "../platform/index.js";

import { CLIENT_INFO_STORAGE, KNOWN_CLIENT_ID } from "./constants.js";
import { Configuration } from "./config.js";
import PingUploadManager from "./upload/manager.js";
import {
  extractBooleanFromString,
  isBoolean,
  isString,
  sanitizeApplicationId,
} from "./utils.js";
import { CoreMetrics } from "./internal_metrics.js";
import { DatetimeMetric } from "./metrics/types/datetime.js";
import CorePings from "./internal_pings.js";
import { Lifetime } from "./metrics/lifetime.js";
import { Context } from "./context.js";
import log, { LoggingLevel } from "./log.js";
import MetricsDatabase from "./metrics/database.js";
import EventsDatabase from "./metrics/events_database/index.js";
import PingsDatabase from "./pings/database.js";
import ErrorManager from "./error/index.js";
import GleanMetrics from "./glean_metrics.js";

const LOG_TAG = "core.Glean";

enum DebugOption {
  DebugTag = "DebugTag",
  SourceTags = "SourceTags",
  LogPings = "LogPings",
}
type DebugOptionValue = keyof typeof DebugOption;

/**
 * Set the value of a debug option in SessionStorage.
 *
 * @param option The debug option key to set.
 * @param value The value of the debug option.
 */
const setDebugOptionInSessionStorage = (
  option: DebugOptionValue,
  value: boolean | string | string[]
) => {
  const key = `Glean.${option.toString()}`;

  switch (option) {
  case DebugOption.DebugTag:
    sessionStorage.setItem(key, value as string);
    break;
  case DebugOption.LogPings:
    sessionStorage.setItem(key, (value as boolean).toString());
    break;
  case DebugOption.SourceTags:
    sessionStorage.setItem(key, (value as string[]).join(","));
    break;
  }
};

/**
 * Get a debug option value from SessionStorage using the key.
 *
 * @param option The debug option key to fetch the value of.
 * @returns The stringified value.
 */
const getDebugOptionFromSessionStorage = (
  option: DebugOptionValue
): string | undefined => {
  return sessionStorage.getItem(`Glean.${option.toString()}`) || undefined;
};

namespace Glean {
  // An instance of the ping uploader.
  export let pingUploader: PingUploadManager;

  // Temporary holders for debug values,
  // to be used when these values are set before initialize
  // and can be applied during initialized.
  export let preInitDebugViewTag: string | undefined;
  export let preInitLogPings: boolean | undefined;
  export let preInitSourceTags: string[] | undefined;

  /**
   * Handles the changing of state from upload disabled to enabled.
   *
   * Should only be called when the state actually changes.
   *
   * The `uploadEnabled` flag is set to true and the core Glean metrics are recreated.
   */
  function onUploadEnabled(): void {
    Context.uploadEnabled = true;
    pingUploader.resumeUploads();
  }

  /**
   * Handles the changing of state from upload enabled to disabled.
   *
   * Should only be called when the state actually changes.
   *
   * A deletion_request ping is sent, all pending metrics, events and queued
   * pings are cleared, and the client_id is set to KNOWN_CLIENT_ID.
   * Afterward, the upload_enabled flag is set to false.
   *
   * @param at_init Whether or not upload has been disabled during initialization.
   */
  function onUploadDisabled(at_init: boolean): void {
    // It's fine to set this before submitting the deletion request ping,
    // that ping is still sent even if upload is disabled.
    let reason: string;
    if (at_init) {
      reason = "at_init";
    } else {
      reason = "set_upload_enabled";
    }
    Context.uploadEnabled = false;
    // We need to use an undispatched submission to guarantee that the
    // ping is collected before metric are cleared, otherwise we end up
    // with malformed pings.
    Context.corePings.deletionRequest.submit(reason);
    clearMetrics();
  }

  /**
   * Clears any pending metrics and pings.
   *
   * This function is only supposed to be called when telemetry is disabled.
   */
  function clearMetrics(): void {
    // Clear enqueued upload jobs and clear pending pings queue.
    //
    // The only job that will still be sent is the deletion-request ping.
    pingUploader.clearPendingPingsQueue();

    // There is only one metric that we want to survive after clearing all
    // metrics: first_run_date. Here, we store its value
    // so we can restore it after clearing the metrics.
    //
    // Note: This will throw in case the stored metric is incorrect or inexistent.
    // The most likely is that it throws if the metrics hasn't been set,
    // e.g. we start Glean for the first with upload disabled.
    let firstRunDate: Date;
    try {
      firstRunDate = new DatetimeMetric(
        Context.metricsDatabase.getMetric(
          CLIENT_INFO_STORAGE,
          Context.coreMetrics.firstRunDate
        )
      ).date;
    } catch {
      firstRunDate = new Date();
    }

    // Clear the databases.
    Context.eventsDatabase.clearAll();
    Context.metricsDatabase.clearAll();
    Context.pingsDatabase.clearAll();

    // We need to briefly set upload_enabled to true here so that `set`
    // is not a no-op.
    //
    // This is safe.
    //
    // `clearMetrics` is either called on `initialize` or `setUploadEnabled`.
    // Both are dispatched tasks, which means that any other dispatched task
    // called after them will only be executed after they are done.
    // Since all external API calls are dispatched, it is not possible
    // for any other API call to be execute concurrently with this one.
    Context.uploadEnabled = true;

    // Store a "dummy" KNOWN_CLIENT_ID in the client_id metric. This will
    // make it easier to detect if pings were unintentionally sent after
    // uploading is disabled.
    Context.coreMetrics.clientId.set(KNOWN_CLIENT_ID);

    // Restore the first_run_date.
    Context.coreMetrics.firstRunDate.set(firstRunDate);

    Context.uploadEnabled = false;
  }

  /**
   * Fetch debug options from SessionStorage and set the Glean preInit debug options.
   */
  function setDebugOptionsFromSessionStorage() {
    // If we cannot access browser APIs, we do nothing.
    if (
      typeof window === "undefined" ||
      typeof window.sessionStorage === "undefined"
    ) {
      return;
    }

    const logPings = getDebugOptionFromSessionStorage(DebugOption.LogPings);
    if (logPings) {
      preInitLogPings = extractBooleanFromString(logPings);
    }

    const debugViewTag = getDebugOptionFromSessionStorage(DebugOption.DebugTag);
    if (debugViewTag) {
      preInitDebugViewTag = debugViewTag;
    }

    const sourceTags = getDebugOptionFromSessionStorage(DebugOption.SourceTags);
    if (sourceTags) {
      preInitSourceTags = sourceTags.split(",");
    }
  }

  /**
   * Initialize  This method should only be called once, subsequent calls will be no-op.
   *
   * @param applicationId The application ID (will be sanitized during initialization).
   * @param uploadEnabled Determines whether telemetry is enabled.
   *        If disabled, all persisted metrics, events and queued pings
   *        (except first_run_date) are cleared.
   * @param config Glean configuration options.
   * @throws
   * - If config.serverEndpoint is an invalid URL;
   * - If the application if is an empty string.
   */
  export function initialize(
    applicationId: string,
    uploadEnabled: boolean,
    config?: ConfigurationInterface
  ): void {
    if (Context.initialized) {
      log(
        LOG_TAG,
        "Attempted to initialize Glean, but it has already been initialized. Ignoring.",
        LoggingLevel.Warn
      );
      return;
    }

    if (!isString(applicationId)) {
      log(
        LOG_TAG,
        "Unable to initialize Glean, applicationId must be a string.",
        LoggingLevel.Error
      );
      return;
    }

    if (!isBoolean(uploadEnabled)) {
      log(
        LOG_TAG,
        "Unable to initialize Glean, uploadEnabled must be a boolean.",
        LoggingLevel.Error
      );
      return;
    }

    if (applicationId.length === 0) {
      log(
        LOG_TAG,
        "Unable to initialize Glean, applicationId cannot be an empty string.",
        LoggingLevel.Error
      );
      return;
    }

    if (!Context.platform) {
      log(
        LOG_TAG,
        "Unable to initialize Glean, platform has not been set.",
        LoggingLevel.Error
      );
      return;
    }

    Context.coreMetrics = new CoreMetrics();
    Context.corePings = new CorePings();

    Context.applicationId = sanitizeApplicationId(applicationId);

    // The configuration constructor will throw in case config has any incorrect prop.
    Context.config = new Configuration(config);

    // Pre-set debug options for Glean from browser SessionStorage values.
    setDebugOptionsFromSessionStorage();

    if (preInitLogPings) Context.config.logPings = preInitLogPings;
    if (preInitDebugViewTag) Context.config.debugViewTag = preInitDebugViewTag;
    if (preInitSourceTags) Context.config.sourceTags = preInitSourceTags;

    Context.metricsDatabase = new MetricsDatabase();
    Context.eventsDatabase = new EventsDatabase();
    Context.pingsDatabase = new PingsDatabase();
    Context.errorManager = new ErrorManager();

    pingUploader = new PingUploadManager(Context.config, Context.pingsDatabase);

    Context.initialized = true;

    Context.uploadEnabled = uploadEnabled;

    // Initialize the events database.
    //
    // It's important this happens _after_ the upload state is set,
    // because initializing the events database may record the execution_counter and
    // glean.restarted metrics. If the upload state is not defined these metrics cannot be recorded.
    //
    // This may also submit an 'events' ping,
    // so it also needs to happen before application lifetime metrics are cleared.
    Context.eventsDatabase.initialize();

    // The upload enabled flag may have changed since the last run, for
    // example by the changing of a config file.
    if (uploadEnabled) {
      // IMPORTANT!
      // Any pings we want to send upon initialization should happen before this line.
      //
      // Clear application lifetime metrics.
      //
      // If upload is disabled we don't need to do this,
      // all metrics will be cleared anyways and we want
      // application lifetime metrics intact in case
      // we need to send a deletion-request ping.
      Context.metricsDatabase.clear(Lifetime.Application);

      // If upload is enabled,
      // just follow the normal code path to instantiate the core metrics.
      onUploadEnabled();
      Context.coreMetrics.initialize();

      // Record a page load event if the client has auto page-load events enabled.
      if (config?.enableAutoPageLoadEvents) {
        // This function call has no parameters because auto-instrumentation
        // means there are no overrides.
        GleanMetrics.pageLoad();
      }

      // Record click events if the client has auto element click events enabled.
      if (config?.enableAutoElementClickEvents) {
        document.addEventListener("click", (event) => {
          GleanMetrics.handleClickEvent(event);
        });
      }
    } else {
      // If upload is disabled, and we've never run before, only set the
      // client_id to KNOWN_CLIENT_ID, but do not send a deletion request
      // ping.
      // If we have run before, and if the client_id is not equal to
      // the KNOWN_CLIENT_ID, do the full upload disabled operations to
      // clear metrics, set the client_id to KNOWN_CLIENT_ID, and send a
      // deletion request ping.
      const clientId = Context.metricsDatabase.getMetric(
        CLIENT_INFO_STORAGE,
        Context.coreMetrics.clientId
      );

      if (clientId) {
        if (clientId !== KNOWN_CLIENT_ID) {
          onUploadDisabled(true);
        }
      } else {
        // Call `clearMetrics` directly here instead of `onUploadDisabled` to avoid sending
        // a deletion-request ping for a user that has already done that.
        clearMetrics();
      }
    }

    // We only scan the pending pings **after** dealing with the upload state.
    // If upload is disabled, pending pings files are deleted
    // so we need to know that state **before** scanning the pending pings
    // to ensure we don't enqueue pings before their files are deleted.
    Context.pingsDatabase.scanPendingPings();
  }

  /**
   * Sets whether upload is enabled or not.
   *
   * When uploading is disabled, metrics aren't recorded at all and no
   * data is uploaded.
   *
   * When disabling, all pending metrics, events and queued pings are cleared.
   *
   * When enabling, the core Glean metrics are recreated.
   *
   * If the value of this flag is not actually changed, this is a no-op.
   *
   * @param flag When true, enable metric collection.
   */
  export function setUploadEnabled(flag: boolean): void {
    if (!Context.initialized) {
      log(
        LOG_TAG,
        [
          "Changing upload enabled before Glean is initialized is not supported.\n",
          "Pass the correct state into `initialize`.\n",
          "See documentation at https://mozilla.github.io/glean/book/user/general-api.html#initializing-the-glean-sdk`",
        ],
        LoggingLevel.Error
      );
      return;
    }

    if (!isBoolean(flag)) {
      log(
        LOG_TAG,
        "Unable to change upload state, new value must be a boolean. Ignoring.",
        LoggingLevel.Error
      );
      return;
    }

    if (Context.uploadEnabled !== flag) {
      if (flag) {
        onUploadEnabled();
        Context.coreMetrics.initialize();
      } else {
        onUploadDisabled(false);
      }
    }
  }

  /**
   * Sets the experimentation identifier
   *
   * @param experimentationId The string identifier to set
   */
  export function setExperimentationId(experimentationId: string): void {
    Context.config.experimentationId = experimentationId;
  }

  /**
   * Sets the `logPings` debug option.
   *
   * When this flag is `true` pings will be logged to the console right before they are collected.
   *
   * @param flag Whether or not to log pings.
   */
  export function setLogPings(flag: boolean): void {
    if (!Context.initialized) {
      // Cache value to apply during init.
      preInitLogPings = flag;
    } else {
      Context.config.logPings = flag;
    }
  }

  /**
   * Sets the `debugViewTag` debug option.
   *
   * When this property is set, all subsequent outgoing pings will include the `X-Debug-ID` header
   * which will redirect them to the ["Ping Debug Viewer"](https://debug-ping-preview.firebaseapp.com/).
   *
   * @param value The value of the header.
   *        This value must satisfy the regex `^[a-zA-Z0-9-]{1,20}$` otherwise it will be ignored.
   */
  export function setDebugViewTag(value: string): void {
    if (!Context.initialized) {
      // Cache value to apply during init.
      preInitDebugViewTag = value;
    } else {
      Context.config.debugViewTag = value;
    }
  }

  /**
   * Sets the `sourceTags` debug option.
   *
   * Ping tags will show in the destination datasets, after ingestion.
   *
   * Note: Setting `sourceTags` will override all previously set tags.
   *
   * @param value A vector of at most 5 valid HTTP header values.
   *        Individual tags must match the regex: "[a-zA-Z0-9-]{1,20}".
   */
  export function setSourceTags(value: string[]): void {
    if (!Context.initialized) {
      // Cache value to apply during init.
      preInitSourceTags = value;
    } else {
      Context.config.sourceTags = value;
    }
  }

  /**
   * Sets the current environment.
   *
   * This function **must** be called before initialize.
   *
   * @param platform The environment to set.
   *        Please check out the available environments in the platform/ module.
   */
  export function setPlatform(platform: Platform): void {
    // Platform can only be set if Glean is uninitialized,
    // because initialize will make sure to recreate any
    // databases in case another platform was set previously.
    //
    // **Note**: Users should only be able to replace the platform in testing
    // situations, if they call initialize before calling testReset
    // We want to replace whatever platform was set by initialize with the
    // testing platforms in this case and that is possible because testResetGlean
    // uninitializes Glean before setting the testing platform.
    if (Context.initialized) {
      return;
    }

    if (
      Context.isPlatformSet() &&
      Context.platform.name !== platform.name &&
      !Context.testing
    ) {
      log(
        LOG_TAG,
        [
          `IMPOSSIBLE: Attempted to change Glean's targeted platform",
            "from "${Context.platform.name}" to "${platform.name}". Ignoring.`,
        ],
        LoggingLevel.Error
      );
    }

    Context.platform = platform;
  }
}

// Declare global variables for debugging in the browser.
declare global {
  interface Window {
    Glean: {
      setLogPings: (flag: boolean) => void;
      setDebugViewTag: (value: string) => void;
      setSourceTags: (value: string[]) => void;
      debugSession: () => void;
    };
  }
}

// Only set `Glean` values whenever running inside of a browser.
// When cookies/localStorage/sessionStorage are disabled (at least in Firefox
// and Chrome), an access attempt on the window.sessionStorage property will
// throw an error ("The operation is insecure." in Firefox).
// So try-catch is needed here.
let hasStorage = false;
try {
  hasStorage = typeof window !== "undefined" &&
  typeof window.sessionStorage !== "undefined";
} catch (e) {
  console.error("No session storage available", e);
}

if (hasStorage) {
  window.Glean = {
    setLogPings: (flag: boolean) => {
      setDebugOptionInSessionStorage(DebugOption.LogPings, flag);
      Glean.setLogPings(flag);
      console.log(
        "Pings will be logged to the console until this tab is closed."
      );
    },
    setDebugViewTag: (value: string) => {
      setDebugOptionInSessionStorage(DebugOption.DebugTag, value);
      Glean.setDebugViewTag(value);
      console.log(
        "Pings will be sent to the Debug Ping Viewer until this tab is closed. Pings can be found here: https://debug-ping-preview.firebaseapp.com/."
      );
    },
    setSourceTags: (value: string[]) => {
      setDebugOptionInSessionStorage(DebugOption.SourceTags, value);
      Glean.setSourceTags(value);
      console.log(
        "Pings will be given the specified tags until the tab is closed."
      );
    },
    debugSession: () => {
      const sessionId = Context.metricsDatabase.getMetric(
        CLIENT_INFO_STORAGE,
        Context.coreMetrics.sessionId
      );

      if (!!sessionId && typeof sessionId === "string" && !!Context.config.debugViewTag) {
        window.open(
          `https://debug-ping-preview.firebaseapp.com/stream/${Context.config.debugViewTag}#${sessionId}`,
          "_blank"
        );
      } else {
        console.info("You must set a debug tag via `window.Glean.setDebugViewTag` before debugging your session.");
      }
    }
  };
}

export default Glean;
