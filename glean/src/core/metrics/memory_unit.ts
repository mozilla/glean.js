/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

export enum MemoryUnit {
  // 1 byte
  Byte = "byte",
  // 2^10 bytes
  Kilobyte = "kilobyte",
  // 2^20 bytes
  Megabyte = "megabyte",
  // 2^30 bytes
  Gigabyte = "gigabyte",
}

/**
 * Converts a value in a given unit to bytes.
 *
 * @param value The value to convert.
 * @param memoryUnit The `MemoryUnit` to convert from.
 * @returns The integer representation of the byte value.
 */
export function convertMemoryUnitToBytes(value: number, memoryUnit: MemoryUnit): number {
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
