import { isObject } from "../../utils.js";
import log, { LoggingLevel } from "../../log.js";
import { Context } from "../../context.js";
import { getPingSize, isDeletionRequest, isValidPingInternalRepresentation, PINGS_DATABASE_LOG_TAG, sortPings } from "./shared.js";
class PingsDatabaseSync {
    constructor() {
        this.store = new Context.platform.Storage("pings");
    }
    attachObserver(observer) {
        this.observer = observer;
    }
    recordPing(path, identifier, payload, headers) {
        const ping = {
            collectionDate: new Date().toISOString(),
            path,
            payload
        };
        if (headers) {
            ping.headers = headers;
        }
        this.store.update([identifier], () => ping);
        this.observer && this.observer.update(identifier, ping);
    }
    deletePing(identifier) {
        this.store.delete([identifier]);
    }
    getAllPings() {
        const allStoredPings = this.store.get();
        const finalPings = {};
        if (isObject(allStoredPings)) {
            for (const identifier in allStoredPings) {
                const ping = allStoredPings[identifier];
                if (isValidPingInternalRepresentation(ping)) {
                    finalPings[identifier] = ping;
                }
                else {
                    log(PINGS_DATABASE_LOG_TAG, `Unexpected data found in pings database: ${JSON.stringify(ping, null, 2)}. Deleting.`, LoggingLevel.Warn);
                    this.store.delete([identifier]);
                }
            }
        }
        return sortPings(finalPings);
    }
    scanPendingPings() {
        if (!this.observer) {
            return;
        }
        const pings = this.getAllPingsWithoutSurplus();
        for (const [identifier, ping] of pings) {
            this.observer.update(identifier, ping);
        }
    }
    clearAll() {
        this.store.delete([]);
    }
    getAllPingsWithoutSurplus(maxCount = 250, maxSize = 10 * 1024 * 1024) {
        const allPings = this.getAllPings();
        const pings = allPings
            .filter(([_, ping]) => !isDeletionRequest(ping))
            .reverse();
        const deletionRequestPings = allPings.filter(([_, ping]) => isDeletionRequest(ping));
        const total = pings.length;
        if (total > maxCount) {
            log(PINGS_DATABASE_LOG_TAG, [
                `More than ${maxCount} pending pings in the pings database,`,
                `will delete ${total - maxCount} old pings.`
            ], LoggingLevel.Warn);
        }
        let deleting = false;
        let pendingPingsCount = 0;
        let pendingPingsDatabaseSize = 0;
        const remainingPings = [];
        for (const [identifier, ping] of pings) {
            pendingPingsCount++;
            pendingPingsDatabaseSize += getPingSize(ping);
            if (!deleting && pendingPingsDatabaseSize > maxSize) {
                log(PINGS_DATABASE_LOG_TAG, [
                    `Pending pings database has reached the size quota of ${maxSize} bytes,`,
                    "outstanding pings will be deleted."
                ], LoggingLevel.Warn);
                deleting = true;
            }
            if (pendingPingsCount > maxCount) {
                deleting = true;
            }
            if (deleting) {
                this.deletePing(identifier);
            }
            else {
                remainingPings.unshift([identifier, ping]);
            }
        }
        return [...deletionRequestPings, ...remainingPings];
    }
}
export default PingsDatabaseSync;
