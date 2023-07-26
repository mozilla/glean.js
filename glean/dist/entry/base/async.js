import Glean from "../../core/glean/async.js";
export const baseAsync = (platform) => {
    return {
        initialize(applicationId, uploadEnabled, config) {
            Glean.setPlatform(platform);
            Glean.initialize(applicationId, uploadEnabled, config);
        },
        setUploadEnabled(flag) {
            Glean.setUploadEnabled(flag);
        },
        setLogPings(flag) {
            Glean.setLogPings(flag);
        },
        setDebugViewTag(value) {
            Glean.setDebugViewTag(value);
        },
        shutdown() {
            return Glean.shutdown();
        },
        setSourceTags(value) {
            Glean.setSourceTags(value);
        }
    };
};
