/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import { GLEAN_SCHEMA_VERSION, GLEAN_VERSION, PING_INFO_STORAGE, CLIENT_INFO_STORAGE } from "../constants.js";
import CounterMetricType from "../metrics/types/counter.js";
import { CounterMetric } from "../metrics/types/counter_metric.js";
import DatetimeMetricType from "../metrics/types/datetime.js";
import { DatetimeMetric } from "../metrics/types/datetime_metric.js";
import TimeUnit from "../metrics/time_unit.js";
import type { ClientInfo, PingInfo, PingPayload } from "../pings/ping_payload.js";
import type CommonPingData from "./common_ping_data.js";
import CoreEvents from "../events/index.js";
import type MetricsDatabase from "../metrics/database.js";
import type EventsDatabase from "../metrics/events_database.js";
import type { DebugOptions } from "../debug_options.js";
import { Lifetime } from "../metrics/lifetime.js";
import { Context } from "../context.js";

// The moment the current Glean.js session started.
const GLEAN_START_TIME = new Date();

/**
 * Gets, and then increments, the sequence number for a given ping.
 *
 * @param metricsDatabase The metrics database.
 * @param ping The ping for which we want to get the sequence number.
 *
 * @returns The current number (before incrementing).
 */
export async function getSequenceNumber(metricsDatabase: MetricsDatabase, ping: CommonPingData): Promise<number> {
  const seq = new CounterMetricType({
    category: "",
    name: `${ping.name}#sequence`,
    sendInPings: [PING_INFO_STORAGE],
    lifetime: Lifetime.User,
    disabled: false
  });

  const currentSeqData = await metricsDatabase.getMetric(PING_INFO_STORAGE, seq);
  await CounterMetricType._private_addUndispatched(seq, 1);

  if (currentSeqData) {
    // Creating a new counter metric validates that the metric stored is actually a number.
    // When we `add` we deal with getting rid of that number from storage,
    // no need to worry about that here.
    try {
      const metric = new CounterMetric(currentSeqData);
      return metric.payload();
    } catch(e) {
      console.warn(`Unexpected value found for sequence number in ping ${ping.name}. Ignoring.`);
    }
  }

  return 0;
}

/**
 * Gets the formatted start and end times for this ping
 * and updates for the next ping.
 *
 * @param metricsDatabase The metrics database.
 * @param ping The ping for which we want to get the times.
 *
 * @returns An object containing start and times in their payload format.
 */
export async function getStartEndTimes(metricsDatabase: MetricsDatabase, ping: CommonPingData): Promise<{ startTime: string, endTime: string }> {
  const start = new DatetimeMetricType({
    category: "",
    name: `${ping.name}#start`,
    sendInPings: [PING_INFO_STORAGE],
    lifetime: Lifetime.User,
    disabled: false
  }, TimeUnit.Minute);

  // "startTime" is the time the ping was generated the last time.
  // If not available, we use the date the Glean object was initialized.
  const startTimeData = await metricsDatabase.getMetric(PING_INFO_STORAGE, start);
  let startTime: DatetimeMetric;
  if (startTimeData) {
    startTime = new DatetimeMetric(startTimeData);
  } else {
    startTime = DatetimeMetric.fromDate(GLEAN_START_TIME, TimeUnit.Minute);
  }

  // Update the start time with the current time.
  const endTimeData = new Date();
  await DatetimeMetricType._private_setUndispatched(start, endTimeData);
  const endTime = DatetimeMetric.fromDate(endTimeData, TimeUnit.Minute);

  return {
    startTime: startTime.payload(),
    endTime: endTime.payload()
  };
}

/**
 * Builds the `ping_info` section of a ping.
 *
 * @param metricsDatabase The metrics database.
 * @param ping The ping to build the `ping_info` section for.
 * @param reason The reason for submitting this ping.
 *
 * @returns The final `ping_info` section in its payload format.
 */
export async function buildPingInfoSection(metricsDatabase: MetricsDatabase, ping: CommonPingData, reason?: string): Promise<PingInfo> {
  const seq = await getSequenceNumber(metricsDatabase, ping);
  const { startTime, endTime } = await getStartEndTimes(metricsDatabase, ping);

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
 * @param metricsDatabase The metrics database.
 * @param ping The ping to build the `client_info` section for.
 *
 * @returns The final `client_info` section in its payload format.
 */
export async function buildClientInfoSection(metricsDatabase: MetricsDatabase, ping: CommonPingData): Promise<ClientInfo> {
  let clientInfo = await metricsDatabase.getPingMetrics(CLIENT_INFO_STORAGE, true);
  if (!clientInfo) {
    // TODO: Watch Bug 1685705 and change behaviour in here accordingly.
    console.warn("Empty client info data. Will submit anyways.");
    clientInfo = {};
  }

  let finalClientInfo: ClientInfo = {
    "telemetry_sdk_build": GLEAN_VERSION
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
 * Gathers all the headers to be included to the final ping request.
 *
 * This guarantees that if headers are disabled after the ping collection,
 * ping submission will still contain the desired headers.
 *
 * The current headers gathered here are:
 * - [X-Debug-ID]
 * - [X-Source-Tags]
 *
 * @param debugOptions The debug options.
 *
 * @returns An object containing all the headers and their values
 *          or `undefined` in case no custom headers were set.
 */
export function getPingHeaders(debugOptions?: DebugOptions): Record<string, string> | undefined {
  const headers: Record<string, string> = {};

  if (debugOptions?.debugViewTag) {
    headers["X-Debug-ID"] = debugOptions.debugViewTag;
  }

  if (debugOptions?.sourceTags) {
    headers["X-Source-Tags"] = debugOptions.sourceTags.toString();
  }

  if (Object.keys(headers).length > 0) {
    return headers;
  }
}

/**
 * Collects a snapshot for the given ping from storage and attach required meta information.
 *
 * @param metricsDatabase The metrics database.
 * @param eventsDatabase The events database.
 * @param ping The ping to collect for.
 * @param reason An optional reason code to include in the ping.
 *
 * @returns A fully assembled JSON representation of the ping payload.
 *          If there is no data stored for the ping, `undefined` is returned.
 */
export async function collectPing(metricsDatabase: MetricsDatabase, eventsDatabase: EventsDatabase, ping: CommonPingData, reason?: string): Promise<PingPayload | undefined> {
  const metricsData = await metricsDatabase.getPingMetrics(ping.name, true);
  const eventsData = await eventsDatabase.getPingEvents(ping.name, true);
  if (!metricsData && !eventsData && !ping.sendIfEmpty) {
    console.info(`Storage for ${ping.name} empty. Bailing out.`);
    return;
  } else if (!metricsData) {
    console.info(`Storage for ${ping.name} empty. Ping will still be sent.`);
  }

  const metrics = metricsData ? { metrics: metricsData } : {};
  const events = eventsData ? { events: eventsData } : {};
  const pingInfo = await buildPingInfoSection(metricsDatabase, ping, reason);
  const clientInfo = await buildClientInfoSection(metricsDatabase, ping);
  return {
    ...metrics,
    ...events,
    ping_info: pingInfo,
    client_info: clientInfo,
  };
}

/**
 * Build a pings submition path.
 *
 * @param applicationId The application id.
 * @param identifier The pings UUID identifier.
 * @param ping  The ping to build a path for.
 *
 * @returns The final submission path.
 */
export function makePath(applicationId: string, identifier: string, ping: CommonPingData): string {
  // We are sure that the applicationId is not `undefined` at this point,
  // this function is only called when submitting a ping
  // and that function return early when Glean is not initialized.
  return `/submit/${applicationId}/${ping.name}/${GLEAN_SCHEMA_VERSION}/${identifier}`;
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
 *
 * @returns A promise that is resolved once collection and storing is done.
 */
export async function collectAndStorePing(identifier: string, ping: CommonPingData, reason?: string): Promise<void> {
  const collectedPayload = await collectPing(Context.metricsDatabase, Context.eventsDatabase, ping, reason);
  if (!collectedPayload) {
    return;
  }

  let modifiedPayload;
  try {
    modifiedPayload = await CoreEvents.afterPingCollection.trigger(collectedPayload);
  } catch(e) {
    console.error(
      `Error while attempting to modify ping payload for the "${ping.name}" ping using`,
      `the ${JSON.stringify(CoreEvents.afterPingCollection.registeredPluginIdentifier)} plugin.`,
      "Ping will not be submitted. See more logs below.\n\n",
      e
    );

    return;
  }

  if (Context.debugOptions.logPings) {
    console.info(JSON.stringify(collectedPayload, null, 2));
  }
  const finalPayload = modifiedPayload ? modifiedPayload : collectedPayload;
  const headers = getPingHeaders(Context.debugOptions);
  return Context.pingsDatabase.recordPing(
    makePath(Context.applicationId, identifier, ping),
    identifier,
    finalPayload,
    headers
  );
}

export default collectAndStorePing;
