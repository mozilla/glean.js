export declare enum MemoryUnit {
    Byte = "byte",
    Kilobyte = "kilobyte",
    Megabyte = "megabyte",
    Gigabyte = "gigabyte"
}
/**
 * Converts a value in a given unit to bytes.
 *
 * @param value The value to convert.
 * @param memoryUnit The `MemoryUnit` to convert from.
 * @returns The integer representation of the byte value.
 */
export declare function convertMemoryUnitToBytes(value: number, memoryUnit: MemoryUnit): number;
