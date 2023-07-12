/**
 * The common set of data for creating a new ping.
 */
export default interface CommonPingData {
    readonly name: string;
    readonly includeClientId: boolean;
    readonly sendIfEmpty: boolean;
    readonly reasonCodes?: string[];
}
