import TestPlatform from "../../platform/test/index.js";
import { Context } from "../context.js";
import { testResetEvents } from "../events/utils/async.js";
import Glean from "../glean/async.js";
export async function testInitializeGlean(applicationId, uploadEnabled = true, config) {
    Context.testing = true;
    Glean.setPlatform(TestPlatform);
    Glean.initialize(applicationId, uploadEnabled, config);
    await Context.dispatcher.testBlockOnQueue();
}
export async function testUninitializeGlean(clearStores = true) {
    if (Context.initialized) {
        await Glean.shutdown();
        if (clearStores) {
            await Context.eventsDatabase.clearAll();
            await Context.metricsDatabase.clearAll();
            await Context.pingsDatabase.clearAll();
        }
        Context.testUninitialize();
        testResetEvents();
        Glean.preInitLogPings = undefined;
        Glean.preInitDebugViewTag = undefined;
        Glean.preInitSourceTags = undefined;
    }
}
