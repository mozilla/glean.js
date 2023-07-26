export var MemoryUnit;
(function (MemoryUnit) {
    MemoryUnit["Byte"] = "byte";
    MemoryUnit["Kilobyte"] = "kilobyte";
    MemoryUnit["Megabyte"] = "megabyte";
    MemoryUnit["Gigabyte"] = "gigabyte";
})(MemoryUnit || (MemoryUnit = {}));
export function convertMemoryUnitToBytes(value, memoryUnit) {
    switch (memoryUnit) {
        case MemoryUnit.Byte:
            return value;
        case MemoryUnit.Kilobyte:
            return value * (2 ** 10);
        case MemoryUnit.Megabyte:
            return value * (2 ** 20);
        case MemoryUnit.Gigabyte:
            return value * (2 ** 30);
    }
}
