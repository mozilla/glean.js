import log from "../log.js";
import { createLogTag, getErrorMetricForMetric } from "./shared.js";
export default class ErrorManagerSync {
    record(metric, error, message, numErrors = 1) {
        const errorMetric = getErrorMetricForMetric(metric, error);
        log(createLogTag(metric), [`${metric.baseIdentifier()}:`, message]);
        if (numErrors > 0) {
            errorMetric.add(numErrors);
        }
    }
    async testGetNumRecordedErrors(metric, error, ping) {
        const errorMetric = getErrorMetricForMetric(metric, error);
        const numErrors = await errorMetric.testGetValue(ping);
        return numErrors || 0;
    }
}
