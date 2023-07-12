import type { ClientInfo, PingInfo, PingPayload } from "../../pings/ping_payload.js";
import type CommonPingData from "../common_ping_data.js";
/**
 * Gets, and then increments, the sequence number for a given ping.
 *
 * @param ping The ping for which we want to get the sequence number.
 * @returns The current number (before incrementing).
 */
export declare function getSequenceNumber(ping: CommonPingData): Promise<number>;
/**
 * Gets the formatted start and end times for this ping
 * and updates for the next ping.
 *
 * @param ping The ping for which we want to get the times.
 * @returns An object containing start and times in their payload format.
 */
export declare function getStartEndTimes(ping: CommonPingData): Promise<{
    startTime: string;
    endTime: string;
}>;
/**
 * Builds the `ping_info` section of a ping.
 *
 * @param ping The ping to build the `ping_info` section for.
 * @param reason The reason for submitting this ping.
 * @returns The final `ping_info` section in its payload format.
 */
export declare function buildPingInfoSection(ping: CommonPingData, reason?: string): Promise<PingInfo>;
/**
 * Builds the `client_info` section of a ping.
 *
 * @param ping The ping to build the `client_info` section for.
 * @returns The final `client_info` section in its payload format.
 */
export declare function buildClientInfoSection(ping: CommonPingData): Promise<ClientInfo>;
/**
 * Collects a snapshot for the given ping from storage and attach required meta information.
 *
 * @param ping The ping to collect for.
 * @param reason An optional reason code to include in the ping.
 * @returns A fully assembled JSON representation of the ping payload.
 *          If there is no data stored for the ping, `undefined` is returned.
 */
export declare function collectPing(ping: CommonPingData, reason?: string): Promise<PingPayload | undefined>;
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
 * @returns A promise that is resolved once collection and storing is done.
 */
export declare function collectAndStorePing(identifier: string, ping: CommonPingData, reason?: string): Promise<void>;
export default collectAndStorePing;
