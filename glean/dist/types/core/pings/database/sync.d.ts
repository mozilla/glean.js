import type { JSONObject } from "../../utils.js";
import type { IPingDatabase, Observer, PingArray } from "./shared.js";
declare class PingsDatabaseSync implements IPingDatabase {
    private store;
    private observer?;
    constructor();
    attachObserver(observer: Observer): void;
    recordPing(path: string, identifier: string, payload: JSONObject, headers?: Record<string, string>): void;
    deletePing(identifier: string): void;
    getAllPings(): PingArray;
    scanPendingPings(): void;
    clearAll(): void;
    /**
     * Delete surplus of pings in the database by count or database size
     * and return list of remaining pings. Pings are deleted from oldest to newest.
     *
     * The size of the database will be calculated
     * (by accumulating each ping's size in bytes)
     * and in case the quota is exceeded, outstanding pings get deleted.
     *
     * Note: `deletion-request` pings are never deleted.
     *
     * @param maxCount The max number of pings in the database. Default: 250.
     * @param maxSize The max size of the database (in bytes). Default: 10MB.
     * @returns List of all currently stored pings, in ascending order by date.
     *          `deletion-request` pings are always in the front of the list.
     */
    private getAllPingsWithoutSurplus;
}
export default PingsDatabaseSync;
