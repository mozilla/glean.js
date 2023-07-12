import { testInitializeGlean, testUninitializeGlean } from "./utils.js";
export async function testResetGlean(applicationId, uploadEnabled = true, config, clearStores = true) {
    await testUninitializeGlean(clearStores);
    await testInitializeGlean(applicationId, uploadEnabled, config);
}
export * from "./utils.js";
export * from "./events.js";
