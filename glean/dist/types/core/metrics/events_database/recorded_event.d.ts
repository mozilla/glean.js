import type { JSONObject } from "../../utils.js";
import type { MetricValidationResult } from "../metric.js";
import { Metric } from "../metric.js";
export declare type ExtraValues = string | boolean | number;
export declare type ExtraMap = Record<string, ExtraValues>;
export interface Event extends JSONObject {
    readonly category: string;
    readonly name: string;
    readonly timestamp: number;
    extra?: ExtraMap;
}
export declare class RecordedEvent extends Metric<Event, Event> {
    constructor(v: unknown);
    private static withTransformedExtras;
    /**
     * Add another extra key to a RecordedEvent object.
     *
     * @param key The key to add.
     * @param value The value of the key.
     */
    addExtra(key: string, value: ExtraValues): void;
    /**
     * Generate a new Event object,
     * stripped of Glean reserved extra keys.
     *
     * @returns A new Event object.
     */
    withoutReservedExtras(): Event;
    validate(v: unknown): MetricValidationResult;
    /**
     * Generate a new Event object,
     * in the format expected on ping payloads.
     *
     * Strips reserved extra keys
     * and stringifies all event extras.
     *
     * @returns A new RecordedEvent object.
     */
    payload(): Event;
}
