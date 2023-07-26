import type { MetricType } from "../metrics/index.js";
import type { ErrorType } from "./error_type.js";
import type { IErrorManager } from "./shared.js";
export default class ErrorManagerSync implements IErrorManager {
    record(metric: MetricType, error: ErrorType, message: unknown, numErrors?: number): void;
    testGetNumRecordedErrors(metric: MetricType, error: ErrorType, ping?: string): Promise<number>;
}
