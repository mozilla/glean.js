/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import type { ClientInfo, PingInfo, PingPayload } from "../../pings/ping_payload.js";
import type CommonPingData from "../common_ping_data.js";
import type MetricsDatabaseSync from "../../metrics/database/sync.js";
import type { EventsDatabaseSync } from "../../metrics/events_database/sync.js";
import type PingsDatabaseSync from "../database/sync.js";
import type { StartTimeMetricData } from "./shared.js";

import { GLEAN_VERSION, PING_INFO_STORAGE, CLIENT_INFO_STORAGE } from "../../constants.js";
import { CounterMetric } from "../../metrics/types/counter.js";
import { InternalCounterMetricType as CounterMetricType } from "../../metrics/types/counter.js";
import { DatetimeMetric } from "../../metrics/types/datetime.js";
import { InternalDatetimeMetricType as DatetimeMetricType } from "../../metrics/types/datetime.js";
import TimeUnit from "../../metrics/time_unit.js";
import CoreEventsSync from "../../events/sync.js";
import { Lifetime } from "../../metrics/lifetime.js";
import { Context } from "../../context.js";
import log, { LoggingLevel } from "../../log.js";
import { PINGS_MAKER_LOG_TAG, getPingHeaders, makePath } from "./shared.js";

/**
 * Gets the start time metric and its currently stored data.
 *
 * @param ping The ping for which we want to get the times.
 * @returns An object containing the start time metric and its value.
 */
function getStartTimeMetricAndData(ping: CommonPingData): StartTimeMetricData {
  const startTimeMetric = new DatetimeMetricType(
    {
      category: "",
      name: `${ping.name}#start`,
      sendInPings: [PING_INFO_STORAGE],
      lifetime: Lifetime.User,
      disabled: false
    },
    TimeUnit.Minute
  );

  // "startTime" is the time the ping was generated the last time.
  // If not available, we use the date the Glean object was initialized.
  const startTimeData = (Context.metricsDatabase as MetricsDatabaseSync).getMetric(
    PING_INFO_STORAGE,
    startTimeMetric
  );
  let startTime: DatetimeMetric;
  if (startTimeData) {
    startTime = new DatetimeMetric(startTimeData);
  } else {
    startTime = DatetimeMetric.fromDate(Context.startTime, TimeUnit.Minute);
  }

  return {
    startTimeMetric,
    startTime
  };
}

/**
 * Gets, and then increments, the sequence number for a given ping.
 *
 * @param ping The ping for which we want to get the sequence number.
 * @returns The current number (before incrementing).
 */
export function getSequenceNumber(ping: CommonPingData): number {
  const seq = new CounterMetricType({
    category: "",
    name: `${ping.name}#sequence`,
    sendInPings: [PING_INFO_STORAGE],
    lifetime: Lifetime.User,
    disabled: false
  });

  const currentSeqData = (Context.metricsDatabase as MetricsDatabaseSync).getMetric(
    PING_INFO_STORAGE,
    seq
  );
  seq.add(1);

  if (currentSeqData) {
    // Creating a new counter metric validates that the metric stored is actually a number.
    // When we `add` we deal with getting rid of that number from storage,
    // no need to worry about that here.
    try {
      const metric = new CounterMetric(currentSeqData);
      return metric.payload();
    } catch (e) {
      log(
        PINGS_MAKER_LOG_TAG,
        `Unexpected value found for sequence number in ping ${ping.name}. Ignoring.`,
        LoggingLevel.Warn
      );
    }
  }

  return 0;
}

/**
 * Gets the formatted start and end times for this ping
 * and updates for the next ping.
 *
 * @param ping The ping for which we want to get the times.
 * @returns An object containing start and times in their payload format.
 */
export function getStartEndTimes(ping: CommonPingData): { startTime: string; endTime: string } {
  const { startTimeMetric, startTime } = getStartTimeMetricAndData(ping);

  // Update the start time with the current time.
  const endTimeData = new Date();
  startTimeMetric.set(endTimeData);
  const endTime = DatetimeMetric.fromDate(endTimeData, TimeUnit.Minute);

  return {
    startTime: startTime.payload(),
    endTime: endTime.payload()
  };
}

/**
 * Builds the `ping_info` section of a ping.
 *
 * @param ping The ping to build the `ping_info` section for.
 * @param reason The reason for submitting this ping.
 * @returns The final `ping_info` section in its payload format.
 */
export function buildPingInfoSection(ping: CommonPingData, reason?: string): PingInfo {
  const seq = getSequenceNumber(ping);
  const { startTime, endTime } = getStartEndTimes(ping);

  const pingInfo: PingInfo = {
    seq,
    start_time: startTime,
    end_time: endTime
  };

  if (reason) {
    pingInfo.reason = reason;
  }

  return pingInfo;
}

/**
 * Builds the `client_info` section of a ping.
 *
 * @param ping The ping to build the `client_info` section for.
 * @returns The final `client_info` section in its payload format.
 */
export function buildClientInfoSection(ping: CommonPingData): ClientInfo {
  let clientInfo = (Context.metricsDatabase as MetricsDatabaseSync).getPingMetrics(
    CLIENT_INFO_STORAGE,
    true
  );
  if (!clientInfo) {
    // TODO: Watch Bug 1685705 and change behaviour in here accordingly.
    log(PINGS_MAKER_LOG_TAG, "Empty client info data. Will submit anyways.", LoggingLevel.Warn);
    clientInfo = {};
  }

  let finalClientInfo: ClientInfo = {
    telemetry_sdk_build: GLEAN_VERSION
  };
  for (const metricType in clientInfo) {
    finalClientInfo = { ...finalClientInfo, ...clientInfo[metricType] };
  }

  if (!ping.includeClientId) {
    delete finalClientInfo["client_id"];
  }

  return finalClientInfo;
}

/**
 * Collects a snapshot for the given ping from storage and attach required meta information.
 *
 * @param ping The ping to collect for.
 * @param reason An optional reason code to include in the ping.
 * @returns A fully assembled JSON representation of the ping payload.
 *          If there is no data stored for the ping, `undefined` is returned.
 */
export function collectPing(ping: CommonPingData, reason?: string): PingPayload | undefined {
  // !IMPORTANT! Events data needs to be collected BEFORE other metrics,
  // because events collection may result in recording of error metrics.
  const eventsData = (Context.eventsDatabase as EventsDatabaseSync).getPingEvents(ping.name, true);
  const metricsData = (Context.metricsDatabase as MetricsDatabaseSync).getPingMetrics(
    ping.name,
    true
  );
  if (!metricsData && !eventsData) {
    if (!ping.sendIfEmpty) {
      log(PINGS_MAKER_LOG_TAG, `Storage for ${ping.name} empty. Bailing out.`, LoggingLevel.Info);
      return;
    }
    log(
      PINGS_MAKER_LOG_TAG,
      `Storage for ${ping.name} empty. Ping will still be sent.`,
      LoggingLevel.Info
    );
  }

  const metrics = metricsData ? { metrics: metricsData } : {};
  const events = eventsData ? { events: eventsData } : {};
  const pingInfo = buildPingInfoSection(ping, reason);
  const clientInfo = buildClientInfoSection(ping);
  return {
    ...metrics,
    ...events,
    ping_info: pingInfo,
    client_info: clientInfo
  };
}

/**
 * Collects and stores a ping on the pings database.
 *
 * This function will trigger the `AfterPingCollection` event.
 * This event is triggered **after** logging the ping, which happens if `logPings` is set.
 * We will log the payload before it suffers any change by plugins listening to this event.
 *
 * @param identifier The pings UUID identifier.
 * @param ping The ping to submit.
 * @param reason An optional reason code to include in the ping.
 */
export function collectAndStorePing(
  identifier: string,
  ping: CommonPingData,
  reason?: string
): void {
  const collectedPayload = collectPing(ping, reason);
  if (!collectedPayload) {
    return;
  }

  let modifiedPayload;
  try {
    modifiedPayload = CoreEventsSync.afterPingCollection.trigger(collectedPayload);
  } catch (e) {
    log(
      PINGS_MAKER_LOG_TAG,
      [
        `Error while attempting to modify ping payload for the "${ping.name}" ping using`,
        `the ${JSON.stringify(
          CoreEventsSync.afterPingCollection.registeredPluginIdentifier
        )} plugin.`,
        "Ping will not be submitted. See more logs below.\n\n",
        e
      ],
      LoggingLevel.Error
    );

    return;
  }

  if (Context.config.logPings) {
    log(PINGS_MAKER_LOG_TAG, JSON.stringify(collectedPayload, null, 2), LoggingLevel.Info);
  }

  const finalPayload = modifiedPayload ? modifiedPayload : collectedPayload;
  const headers = getPingHeaders();

  (Context.pingsDatabase as PingsDatabaseSync).recordPing(
    makePath(identifier, ping),
    identifier,
    finalPayload,
    headers
  );
}

export default collectAndStorePing;
