import { isObject } from "../../utils.js";
import log, { LoggingLevel } from "../../log.js";
import { Context } from "../../context.js";
import { getPingSize, isDeletionRequest, isValidPingInternalRepresentation, PINGS_DATABASE_LOG_TAG, sortPings } from "./shared.js";
class PingsDatabase {
    constructor() {
        this.store = new Context.platform.Storage("pings");
    }
    attachObserver(observer) {
        this.observer = observer;
    }
    async recordPing(path, identifier, payload, headers) {
        const ping = {
            collectionDate: new Date().toISOString(),
            path,
            payload
        };
        if (headers) {
            ping.headers = headers;
        }
        await this.store.update([identifier], () => ping);
        this.observer && this.observer.update(identifier, ping);
    }
    async deletePing(identifier) {
        await this.store.delete([identifier]);
    }
    async getAllPings() {
        const allStoredPings = await this.store.get();
        const finalPings = {};
        if (isObject(allStoredPings)) {
            for (const identifier in allStoredPings) {
                const ping = allStoredPings[identifier];
                if (isValidPingInternalRepresentation(ping)) {
                    finalPings[identifier] = ping;
                }
                else {
                    log(PINGS_DATABASE_LOG_TAG, `Unexpected data found in pings database: ${JSON.stringify(ping, null, 2)}. Deleting.`, LoggingLevel.Warn);
                    await this.store.delete([identifier]);
                }
            }
        }
        return sortPings(finalPings);
    }
    async scanPendingPings() {
        if (!this.observer) {
            return;
        }
        const pings = await this.getAllPingsWithoutSurplus();
        for (const [identifier, ping] of pings) {
            this.observer.update(identifier, ping);
        }
    }
    async clearAll() {
        await this.store.delete([]);
    }
    async getAllPingsWithoutSurplus(maxCount = 250, maxSize = 10 * 1024 * 1024) {
        const allPings = await this.getAllPings();
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
                await this.deletePing(identifier);
            }
            else {
                remainingPings.unshift([identifier, ping]);
            }
        }
        return [...deletionRequestPings, ...remainingPings];
    }
}
export default PingsDatabase;
